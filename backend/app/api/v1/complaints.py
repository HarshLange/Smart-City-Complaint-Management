from typing import List, Optional
from fastapi import APIRouter, Depends, File, Form, Query, Request, UploadFile, status
from pydantic import BaseModel
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.core.dependencies import (
    get_current_user,
    get_db,
    get_optional_user,
    require_citizen,
)
from app.core.exceptions import (
    BadRequestException,
    EntityNotFoundException,
    ForbiddenException,
    UnauthorizedException,
)
from app.core.rate_limiter import (
    get_client_ip,
    submission_rate_limiter,
    tracking_rate_limiter,
)
from app.core.security import verify_tracking_pin
from app.models.complaint import Complaint
from app.models.enums import ComplaintStatus, UserRole
from app.models.user import User
from app.schemas.complaint import (
    AIPredictionResponse,
    ComplaintAttachmentResponse,
    ComplaintCreateResponse,
    ComplaintDetailResponse,
    ComplaintPublicTrackingResponse,
    OfficerNoteResponse,
    StatusHistoryResponse,
)
from app.services.complaint_service import complaint_service
from app.services.storage_service import storage_service

router = APIRouter(prefix="/complaints", tags=["Complaints"])


class TrackComplaintRequest(BaseModel):
    reference_number: str
    tracking_pin: str


class ReopenComplaintRequest(BaseModel):
    reason: str


def complaint_to_detail_response(complaint: Complaint, show_internal_notes: bool = False) -> ComplaintDetailResponse:
    """Format full complaint detail response with defensive attribute access to prevent MissingGreenlet."""
    raw_attachments = (
        complaint.attachments
        if "attachments" in complaint.__dict__ and complaint.attachments is not None
        else []
    )
    attachments = [
        ComplaintAttachmentResponse(
            id=att.id,
            storage_path=att.storage_path,
            filename=att.filename,
            content_type=att.content_type,
            file_size_bytes=att.file_size_bytes,
            is_resolution_evidence=att.is_resolution_evidence,
            created_at=att.created_at,
            access_url=f"/api/v1/files/download?path={att.storage_path}",
        )
        for att in raw_attachments
    ]

    ai_pred = None
    raw_ai = (
        complaint.ai_prediction
        if "ai_prediction" in complaint.__dict__
        else None
    )
    if raw_ai:
        ai_pred = AIPredictionResponse(
            id=raw_ai.id,
            model_name=raw_ai.model_name,
            model_version=raw_ai.model_version,
            predicted_category=raw_ai.predicted_category,
            confidence_score=raw_ai.confidence_score,
            all_probabilities=raw_ai.all_probabilities,
            suggested_department_code=raw_ai.suggested_department_code,
            processing_status=raw_ai.processing_status,
            error_message=raw_ai.error_message,
            is_overridden=raw_ai.is_overridden,
            override_reason=raw_ai.override_reason,
        )

    raw_history = (
        complaint.status_history
        if "status_history" in complaint.__dict__ and complaint.status_history is not None
        else []
    )
    history = [
        StatusHistoryResponse(
            id=h.id,
            previous_status=h.previous_status,
            new_status=h.new_status,
            actor_name=h.actor_name,
            actor_role=h.actor_role,
            notes=h.notes,
            created_at=h.created_at,
        )
        for h in raw_history
    ]

    raw_notes = (
        complaint.officer_notes
        if "officer_notes" in complaint.__dict__ and complaint.officer_notes is not None
        else []
    )
    notes = [
        OfficerNoteResponse(
            id=n.id,
            officer_name=n.officer_name,
            note_text=n.note_text,
            is_internal=n.is_internal,
            created_at=n.created_at,
        )
        for n in raw_notes
        if show_internal_notes or not n.is_internal
    ]

    dept_name = None
    dept_code = None
    if "department" in complaint.__dict__ and complaint.department:
        dept_name = complaint.department.name
        dept_code = complaint.department.code

    cit_name = "Anonymous Citizen"
    cit_email = None
    if "citizen" in complaint.__dict__ and complaint.citizen:
        cit_name = complaint.citizen.full_name or "Anonymous Citizen"
        cit_email = complaint.citizen.email

    assigned_name = None
    if "assigned_officer" in complaint.__dict__ and complaint.assigned_officer:
        assigned_name = complaint.assigned_officer.full_name

    return ComplaintDetailResponse(
        id=complaint.id,
        reference_number=complaint.reference_number,
        title=complaint.title,
        description=complaint.description,
        status=complaint.status,
        category=complaint.category,
        priority=complaint.priority,
        latitude=complaint.latitude,
        longitude=complaint.longitude,
        address=complaint.address,
        landmark=complaint.landmark,
        resolution_notes=complaint.resolution_notes,
        resolved_at=complaint.resolved_at,
        created_at=complaint.created_at,
        updated_at=complaint.updated_at,
        department_id=complaint.department_id,
        department_name=dept_name,
        department_code=dept_code,
        user_id=complaint.user_id,
        citizen_name=cit_name,
        citizen_email=cit_email,
        assigned_officer_id=complaint.assigned_officer_id,
        assigned_officer_name=assigned_name,
        attachments=attachments,
        ai_prediction=ai_pred,
        status_history=history,
        officer_notes=notes,
    )


@router.post("/", response_model=ComplaintCreateResponse, status_code=status.HTTP_201_CREATED)
async def submit_complaint(
    request: Request,
    title: str = Form(..., min_length=3, max_length=200),
    description: str = Form(..., min_length=10, max_length=4000),
    file: UploadFile = File(...),
    latitude: Optional[float] = Form(None),
    longitude: Optional[float] = Form(None),
    address: Optional[str] = Form(None),
    landmark: Optional[str] = Form(None),
    current_user: User = Depends(require_citizen),
    db: AsyncSession = Depends(get_db),
):
    """Register a new complaint, execute AI classification on photograph, and route to department.
    
    Mandatory Authentication Enforced:
    Only authenticated citizens (or administrators) can register complaints.
    The created complaint is strictly associated with current_user.id.
    """
    client_ip = get_client_ip(request)
    submission_rate_limiter.check(client_ip)

    image_bytes = await file.read()
    filename = file.filename or "complaint.jpg"
    content_type = file.content_type or "image/jpeg"

    complaint, plain_pin = await complaint_service.create_complaint(
        db=db,
        title=title,
        description=description,
        image_bytes=image_bytes,
        filename=filename,
        content_type=content_type,
        user_id=current_user.id,
        latitude=latitude,
        longitude=longitude,
        address=address,
        landmark=landmark,
        client_ip=client_ip,
    )

    needs_review = (complaint.status == ComplaintStatus.UNDER_REVIEW)
    conf_score = 0.0
    if "ai_prediction" in complaint.__dict__ and complaint.ai_prediction:
        conf_score = complaint.ai_prediction.confidence_score

    ai_pred = None
    if "ai_prediction" in complaint.__dict__ and complaint.ai_prediction:
        ai_pred = AIPredictionResponse(
            id=complaint.ai_prediction.id,
            model_name=complaint.ai_prediction.model_name,
            model_version=complaint.ai_prediction.model_version,
            predicted_category=complaint.ai_prediction.predicted_category,
            confidence_score=complaint.ai_prediction.confidence_score,
            all_probabilities=complaint.ai_prediction.all_probabilities,
            suggested_department_code=complaint.ai_prediction.suggested_department_code,
            processing_status=complaint.ai_prediction.processing_status,
            error_message=complaint.ai_prediction.error_message,
            is_overridden=complaint.ai_prediction.is_overridden,
            override_reason=complaint.ai_prediction.override_reason,
        )

    dept_code = None
    dept_name = "Review Queue"
    if "department" in complaint.__dict__ and complaint.department:
        dept_code = complaint.department.code
        dept_name = complaint.department.name

    return ComplaintCreateResponse(
        id=complaint.id,
        reference_number=complaint.reference_number,
        tracking_pin=plain_pin,
        title=complaint.title,
        status=complaint.status,
        category=complaint.category,
        department_code=dept_code,
        department_name=dept_name,
        confidence_score=conf_score,
        needs_review=needs_review,
        message="Complaint submitted successfully. Please preserve your Reference Number and Tracking PIN for tracking.",
        ai_prediction=ai_pred,
    )


@router.post("/track", response_model=ComplaintPublicTrackingResponse)
async def track_complaint_publicly(
    data: TrackComplaintRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Public tracking endpoint using Reference Number + Secure Tracking PIN. Sanitized against PII leakage."""
    client_ip = get_client_ip(request)
    tracking_rate_limiter.check(client_ip)

    complaint = await complaint_service.get_complaint_by_reference(db, data.reference_number)
    if not complaint or not verify_tracking_pin(data.tracking_pin, complaint.tracking_pin_hash):
        raise UnauthorizedException("Invalid Complaint Reference Number or Tracking PIN.")

    timeline = [
        StatusHistoryResponse(
            id=h.id,
            previous_status=h.previous_status,
            new_status=h.new_status,
            actor_name="Municipal Authority",
            actor_role="OFFICER",
            notes=h.notes,
            created_at=h.created_at,
        )
        for h in (complaint.status_history if "status_history" in complaint.__dict__ and complaint.status_history else [])
    ]

    dept_name = "Assigned to Review"
    if "department" in complaint.__dict__ and complaint.department:
        dept_name = complaint.department.name

    return ComplaintPublicTrackingResponse(
        reference_number=complaint.reference_number,
        title=complaint.title,
        status=complaint.status,
        category=complaint.category,
        department_name=dept_name,
        priority=complaint.priority,
        address_summary=complaint.address[:100] if complaint.address else None,
        landmark=complaint.landmark,
        resolution_notes=complaint.resolution_notes,
        created_at=complaint.created_at,
        resolved_at=complaint.resolved_at,
        status_timeline=timeline,
    )


@router.get("/mine", response_model=List[ComplaintDetailResponse])
async def get_my_complaints(
    current_user: User = Depends(require_citizen),
    db: AsyncSession = Depends(get_db),
):
    """List authenticated citizen's personal complaints with strict ownership filtering."""
    stmt = (
        select(Complaint)
        .where(Complaint.user_id == current_user.id)
        .order_by(desc(Complaint.created_at))
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
    complaints = res.scalars().all()
    return [complaint_to_detail_response(c, show_internal_notes=False) for c in complaints]


@router.get("/{complaint_id}", response_model=ComplaintDetailResponse)
async def get_complaint_detail(
    complaint_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get full details of a complaint. Enforces IDOR/BOLA security checks."""
    complaint = await complaint_service.get_complaint_by_id(db, complaint_id)
    if not complaint:
        raise EntityNotFoundException("Complaint", complaint_id)

    # Authorization Check
    if current_user.role == UserRole.CITIZEN:
        if complaint.user_id != current_user.id:
            raise ForbiddenException("You are not authorized to view this complaint.")
        return complaint_to_detail_response(complaint, show_internal_notes=False)

    if current_user.role == UserRole.OFFICER:
        if complaint.department_id != current_user.department_id:
            raise ForbiddenException("Officers cannot view complaints from other departments.")
        return complaint_to_detail_response(complaint, show_internal_notes=True)

    # Administrator has access to all complaints
    return complaint_to_detail_response(complaint, show_internal_notes=True)


@router.post("/{complaint_id}/reopen")
async def reopen_complaint(
    complaint_id: str,
    data: ReopenComplaintRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Citizen or Administrator requests reopening a resolved or closed complaint."""
    return await complaint_service.update_status(
        db=db,
        complaint_id=complaint_id,
        new_status=ComplaintStatus.REOPENED,
        actor=current_user,
        notes=f"Reopening requested: {data.reason}",
    )
