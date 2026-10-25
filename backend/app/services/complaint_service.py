import asyncio
import logging
from datetime import datetime, timezone
from typing import Dict, List, Optional, Tuple
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.core.exceptions import (
    BadRequestException,
    EntityNotFoundException,
    ForbiddenException,
    InvalidTransitionException,
)
from app.core.security import (
    generate_complaint_reference,
    generate_tracking_pin,
    hash_tracking_pin,
)
from app.ml.fusion import multimodal_fusion_engine
from app.ml.inference import run_inference_async
from app.ml.nlp.service import nlp_model_manager
from app.models.audit import AuditEvent, OfficerNote, StatusHistory
from app.models.complaint import AIPrediction, Complaint, ComplaintAttachment
from app.models.enums import AuditActionType, CivicCategory, ComplaintStatus, UserRole
from app.models.notification import Notification
from app.models.user import Department, User
from app.services.storage_service import storage_service

logger = logging.getLogger(__name__)

# Server-side State Machine transition matrix
ALLOWED_TRANSITIONS: Dict[ComplaintStatus, List[ComplaintStatus]] = {
    ComplaintStatus.SUBMITTED: [
        ComplaintStatus.UNDER_REVIEW,
        ComplaintStatus.ASSIGNED,
    ],
    ComplaintStatus.UNDER_REVIEW: [
        ComplaintStatus.ASSIGNED,
        ComplaintStatus.CLOSED,
    ],
    ComplaintStatus.ASSIGNED: [
        ComplaintStatus.IN_PROGRESS,
        ComplaintStatus.UNDER_REVIEW,
    ],
    ComplaintStatus.IN_PROGRESS: [
        ComplaintStatus.RESOLVED,
        ComplaintStatus.UNDER_REVIEW,
    ],
    ComplaintStatus.RESOLVED: [
        ComplaintStatus.CLOSED,
        ComplaintStatus.REOPENED,
    ],
    ComplaintStatus.CLOSED: [
        ComplaintStatus.REOPENED,
    ],
    ComplaintStatus.REOPENED: [
        ComplaintStatus.ASSIGNED,
        ComplaintStatus.IN_PROGRESS,
    ],
}


class ComplaintService:
    """Core domain service for complaint lifecycle, AI routing, state machine, and auditing."""

    @staticmethod
    def validate_transition(
        current: ComplaintStatus,
        target: ComplaintStatus,
        actor_role: UserRole,
        is_owner: bool = False,
    ) -> None:
        """Enforce state transition invariants and actor permissions."""
        if current == target:
            raise BadRequestException(
                f"Complaint is already in status '{current.value}'. Please select a different valid next status.",
                error_code="IDENTICAL_STATUS_TRANSITION",
            )

        allowed_targets = ALLOWED_TRANSITIONS.get(current, [])
        if target not in allowed_targets:
            raise InvalidTransitionException(current.value, target.value)

        # Citizens may only reopen complaints they own
        if actor_role == UserRole.CITIZEN:
            if target != ComplaintStatus.REOPENED or not is_owner:
                raise ForbiddenException("Citizens are only permitted to request reopening resolved/closed cases.")

        # Officers cannot reopen closed complaints directly without administrator action
        if actor_role == UserRole.OFFICER and target == ComplaintStatus.REOPENED:
            raise ForbiddenException("Only administrators or the original citizen may reopen a case.")

    async def create_complaint(
        self,
        db: AsyncSession,
        title: str,
        description: str,
        image_bytes: bytes,
        filename: str,
        content_type: str,
        user_id: Optional[str] = None,
        latitude: Optional[float] = None,
        longitude: Optional[float] = None,
        address: Optional[str] = None,
        landmark: Optional[str] = None,
        client_ip: Optional[str] = None,
    ) -> Tuple[Complaint, str]:
        """Create a complaint, store image in private storage, run AI classification, and route to department."""
        # 1. Validate image payload
        extension = storage_service.validate_image(image_bytes, filename, content_type)

        # 2. Upload original image to private storage
        storage_path = await storage_service.save_image(
            file_bytes=image_bytes, prefix="complaints", extension=extension
        )

        try:
            # 3. Generate high-entropy reference and tracking PIN
            reference_num = generate_complaint_reference()
            plain_pin = generate_tracking_pin()
            hashed_pin = hash_tracking_pin(plain_pin)

            # 4. Execute Parallel Multimodal AI Inference (Vision + NLP)
            vision_task = run_inference_async(image_bytes)
            nlp_task = nlp_model_manager.predict_text_async(title=title, description=description)
            vision_result, nlp_result = await asyncio.gather(vision_task, nlp_task)

            # 5. Multimodal Fusion
            fusion_result = multimodal_fusion_engine.fuse(
                vision_result=vision_result,
                nlp_result=nlp_result,
            )

            predicted_cat_str = fusion_result.get("predicted_category", "other")
            needs_review = fusion_result.get("needs_review", True)
            suggested_dept_code = fusion_result.get("suggested_department_code")

            # Map predicted string to enum safely
            category_enum = CivicCategory.OTHER
            try:
                category_enum = CivicCategory(predicted_cat_str)
            except ValueError:
                category_enum = CivicCategory.OTHER

            disagreement_detected = fusion_result.get("disagreement_detected", False)

            # Resolve department from suggested department code.
            # If multimodal conflict/disagreement is detected, department assignment is held
            # unassigned (None) so it goes strictly to the central review queue for manual triage.
            department_id: Optional[str] = None
            if suggested_dept_code and not disagreement_detected:
                dept_res = await db.execute(
                    select(Department).where(Department.code == suggested_dept_code)
                )
                dept = dept_res.scalar_one_or_none()
                if dept:
                    department_id = dept.id

            # Determine initial complaint status: if low confidence, disagreement, or failed -> UNDER_REVIEW
            initial_status = ComplaintStatus.SUBMITTED
            if needs_review or not department_id:
                initial_status = ComplaintStatus.UNDER_REVIEW
            else:
                initial_status = ComplaintStatus.ASSIGNED

            # 6. Persist Complaint
            complaint = Complaint(
                reference_number=reference_num,
                tracking_pin_hash=hashed_pin,
                user_id=user_id,
                title=title,
                description=description,
                status=initial_status,
                category=category_enum,
                department_id=department_id,
                latitude=latitude,
                longitude=longitude,
                address=address,
                landmark=landmark,
            )
            db.add(complaint)
            await db.flush()

            # 7. Persist Attachment
            attachment = ComplaintAttachment(
                complaint_id=complaint.id,
                storage_path=storage_path,
                filename=filename,
                content_type=content_type,
                file_size_bytes=len(image_bytes),
                is_resolution_evidence=False,
                uploaded_by_id=user_id,
            )
            db.add(attachment)

            # 8. Persist AI Prediction with full multimodal diagnostic data
            diagnostic_probs = {
                "fused": fusion_result.get("all_probabilities", {}),
                "vision": vision_result.get("all_probabilities", {}),
                "nlp": nlp_result.get("all_probabilities", {}),
                "modalities_used": fusion_result.get("modalities_used", []),
                "disagreement_detected": fusion_result.get("disagreement_detected", False),
                "fusion_details": fusion_result.get("fusion_details", {}),
            }

            prediction = AIPrediction(
                complaint_id=complaint.id,
                model_name=fusion_result.get("model_name", "Multimodal Fusion"),
                model_version=fusion_result.get("model_version", "Fusion-v1"),
                predicted_category=predicted_cat_str,
                confidence_score=fusion_result.get("confidence_score", 0.0),
                all_probabilities=diagnostic_probs,
                suggested_department_code=suggested_dept_code or "",
                processing_status=fusion_result.get("processing_status", "FAILED"),
                error_message=vision_result.get("error_message") or nlp_result.get("error_message"),
            )
            db.add(prediction)

            # 9. Record Initial Status History
            history = StatusHistory(
                complaint_id=complaint.id,
                previous_status=ComplaintStatus.SUBMITTED,
                new_status=initial_status,
                actor_id=user_id,
                actor_name="Citizen Submission System",
                actor_role="CITIZEN",
                notes="Initial submission registered and processed by multimodal AI classification engine.",
            )
            db.add(history)

            # 10. Record Audit Event
            audit = AuditEvent(
                entity_type="COMPLAINT",
                entity_id=complaint.id,
                action_type=AuditActionType.COMPLAINT_CREATED,
                actor_id=user_id,
                details={
                    "reference_number": reference_num,
                    "ai_predicted_category": predicted_cat_str,
                    "ai_confidence": fusion_result.get("confidence_score"),
                    "status": initial_status.value,
                    "needs_review": needs_review,
                    "modalities_used": fusion_result.get("modalities_used"),
                    "disagreement_detected": fusion_result.get("disagreement_detected"),
                },
                ip_address=client_ip,
            )
            db.add(audit)

            # 10. In-App Notification for Citizen (if registered)
            if user_id:
                notif = Notification(
                    user_id=user_id,
                    complaint_id=complaint.id,
                    title="Complaint Successfully Submitted",
                    message=f"Complaint {reference_num} has been registered and routed to municipal services.",
                    notification_type="STATUS_UPDATE",
                )
                db.add(notif)

            await db.commit()
        except Exception as exc:
            await db.rollback()
            logger.error(
                "Database transaction failed after image upload. Executing compensating storage cleanup for: %s",
                storage_path,
            )
            try:
                await storage_service.delete_file(storage_path)
                logger.info("Compensating cleanup successfully deleted orphaned object: %s", storage_path)
            except Exception as cleanup_err:
                logger.error(
                    "Compensating storage cleanup failed for %s: %s",
                    storage_path,
                    type(cleanup_err).__name__,
                )
            raise exc

        full_complaint = await self.get_complaint_by_id(db, complaint.id)
        return full_complaint, plain_pin

    async def update_status(
        self,
        db: AsyncSession,
        complaint_id: str,
        new_status: ComplaintStatus,
        actor: User,
        notes: Optional[str] = None,
        resolution_notes: Optional[str] = None,
        client_ip: Optional[str] = None,
    ) -> Complaint:
        """Execute validated state transition with immutable audit trail."""
        complaint = await self.get_complaint_by_id(db, complaint_id)
        if not complaint:
            raise EntityNotFoundException("Complaint", complaint_id)

        # Department isolation check for officers
        if actor.role == UserRole.OFFICER:
            if not actor.department_id or complaint.department_id != actor.department_id:
                raise ForbiddenException("Officers are only authorized to update complaints within their department.")

        # Check state transition rules
        is_owner = (complaint.user_id == actor.id)
        self.validate_transition(complaint.status, new_status, actor.role, is_owner=is_owner)

        old_status = complaint.status
        complaint.status = new_status

        if new_status == ComplaintStatus.RESOLVED:
            complaint.resolved_at = datetime.now(timezone.utc)
            if resolution_notes:
                complaint.resolution_notes = resolution_notes

        # History log
        history = StatusHistory(
            complaint_id=complaint.id,
            previous_status=old_status,
            new_status=new_status,
            actor_id=actor.id,
            actor_name=actor.full_name,
            actor_role=actor.role.value,
            notes=notes or resolution_notes,
        )
        db.add(history)

        # Audit event
        audit = AuditEvent(
            entity_type="COMPLAINT",
            entity_id=complaint.id,
            action_type=AuditActionType.STATUS_CHANGED,
            actor_id=actor.id,
            actor_email=actor.email,
            details={
                "previous_status": old_status.value,
                "new_status": new_status.value,
                "notes": notes,
            },
            ip_address=client_ip,
        )
        db.add(audit)

        # Notify citizen
        if complaint.user_id:
            notif = Notification(
                user_id=complaint.user_id,
                complaint_id=complaint.id,
                title=f"Complaint Status Updated: {new_status.value}",
                message=f"Complaint {complaint.reference_number} is now '{new_status.value}'. Notes: {notes or 'Status updated by authorized personnel.'}",
                notification_type="STATUS_UPDATE",
            )
            db.add(notif)

        await db.commit()
        return await self.get_complaint_by_id(db, complaint.id)

    async def override_ai_prediction(
        self,
        db: AsyncSession,
        complaint_id: str,
        admin_user: User,
        new_category: CivicCategory,
        new_department_id: str,
        reason: str,
        client_ip: Optional[str] = None,
    ) -> Complaint:
        """Administrator override of AI prediction and department assignment with audit trail."""
        if admin_user.role != UserRole.ADMIN:
            raise ForbiddenException("Only administrators can override AI predictions.")

        complaint = await self.get_complaint_by_id(db, complaint_id)
        if not complaint:
            raise EntityNotFoundException("Complaint", complaint_id)

        dept_res = await db.execute(select(Department).where(Department.id == new_department_id))
        target_dept = dept_res.scalar_one_or_none()
        if not target_dept:
            raise EntityNotFoundException("Department", new_department_id)

        old_cat = complaint.category
        old_dept_id = complaint.department_id

        complaint.category = new_category
        complaint.department_id = new_department_id

        # If it was under review, promote it to ASSIGNED now that an administrator verified it
        if complaint.status == ComplaintStatus.UNDER_REVIEW:
            complaint.status = ComplaintStatus.ASSIGNED

        # Update AI Prediction record
        if complaint.ai_prediction:
            complaint.ai_prediction.is_overridden = True
            complaint.ai_prediction.overridden_by_id = admin_user.id
            complaint.ai_prediction.override_reason = reason

        # Log audit events
        audit = AuditEvent(
            entity_type="COMPLAINT",
            entity_id=complaint.id,
            action_type=AuditActionType.CATEGORY_OVERRIDDEN,
            actor_id=admin_user.id,
            actor_email=admin_user.email,
            details={
                "previous_category": old_cat.value,
                "new_category": new_category.value,
                "previous_department_id": old_dept_id,
                "new_department_id": new_department_id,
                "reason": reason,
            },
            ip_address=client_ip,
        )
        db.add(audit)

        history = StatusHistory(
            complaint_id=complaint.id,
            previous_status=complaint.status,
            new_status=complaint.status,
            actor_id=admin_user.id,
            actor_name=admin_user.full_name,
            actor_role=admin_user.role.value,
            notes=f"Administrator override: category changed to {new_category.value}, assigned to {target_dept.name}. Reason: {reason}",
        )
        db.add(history)

        await db.commit()
        return await self.get_complaint_by_id(db, complaint.id)

    async def add_officer_note(
        self,
        db: AsyncSession,
        complaint_id: str,
        officer: User,
        note_text: str,
        is_internal: bool = True,
    ) -> OfficerNote:
        """Add an internal or public officer note."""
        complaint = await self.get_complaint_by_id(db, complaint_id)
        if not complaint:
            raise EntityNotFoundException("Complaint", complaint_id)

        if officer.role == UserRole.OFFICER and complaint.department_id != officer.department_id:
            raise ForbiddenException("Officers can only comment on complaints in their department.")

        note = OfficerNote(
            complaint_id=complaint.id,
            officer_id=officer.id,
            officer_name=officer.full_name,
            note_text=note_text,
            is_internal=is_internal,
        )
        db.add(note)
        await db.commit()
        await db.refresh(note)
        return note

    async def add_resolution_evidence(
        self,
        db: AsyncSession,
        complaint_id: str,
        officer: User,
        file_bytes: bytes,
        filename: str,
        content_type: str,
    ) -> ComplaintAttachment:
        """Upload resolution photo evidence."""
        complaint = await self.get_complaint_by_id(db, complaint_id)
        if not complaint:
            raise EntityNotFoundException("Complaint", complaint_id)

        if officer.role == UserRole.OFFICER and complaint.department_id != officer.department_id:
            raise ForbiddenException("Officers can only attach resolution evidence to their department's complaints.")

        extension = storage_service.validate_image(file_bytes, filename, content_type)
        storage_path = await storage_service.save_image(
            file_bytes=file_bytes, prefix="evidence", extension=extension
        )

        try:
            attachment = ComplaintAttachment(
                complaint_id=complaint.id,
                storage_path=storage_path,
                filename=filename,
                content_type=content_type,
                file_size_bytes=len(file_bytes),
                is_resolution_evidence=True,
                uploaded_by_id=officer.id,
            )
            db.add(attachment)
            await db.commit()
            await db.refresh(attachment)
            return attachment
        except Exception as exc:
            await db.rollback()
            logger.error(
                "Database transaction failed after resolution evidence upload. Executing compensating cleanup for: %s",
                storage_path,
            )
            try:
                await storage_service.delete_file(storage_path)
                logger.info("Compensating cleanup successfully deleted orphaned evidence object: %s", storage_path)
            except Exception as cleanup_err:
                logger.error(
                    "Compensating storage cleanup failed for %s: %s",
                    storage_path,
                    type(cleanup_err).__name__,
                )
            raise exc

    async def get_complaint_by_id(
        self, db: AsyncSession, complaint_id: str
    ) -> Optional[Complaint]:
        """Fetch complaint with eager relationships."""
        stmt = (
            select(Complaint)
            .where(Complaint.id == complaint_id)
            .options(
                selectinload(Complaint.citizen),
                selectinload(Complaint.department),
                selectinload(Complaint.assigned_officer),
                selectinload(Complaint.attachments),
                selectinload(Complaint.ai_prediction),
                selectinload(Complaint.status_history),
                selectinload(Complaint.officer_notes),
            )
        )
        res = await db.execute(stmt)
        return res.scalar_one_or_none()

    async def get_complaint_by_reference(
        self, db: AsyncSession, reference_number: str
    ) -> Optional[Complaint]:
        """Fetch complaint by public reference number with eager relationships."""
        stmt = (
            select(Complaint)
            .where(Complaint.reference_number == reference_number.strip().upper())
            .options(
                selectinload(Complaint.citizen),
                selectinload(Complaint.department),
                selectinload(Complaint.attachments),
                selectinload(Complaint.ai_prediction),
                selectinload(Complaint.status_history),
                selectinload(Complaint.officer_notes),
            )
        )
        res = await db.execute(stmt)
        return res.scalar_one_or_none()


complaint_service = ComplaintService()
