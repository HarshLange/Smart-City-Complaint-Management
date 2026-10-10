from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.api.v1.auth import user_to_response
from app.api.v1.complaints import complaint_to_detail_response
from app.core.dependencies import get_db, require_admin
from app.core.exceptions import (
    BadRequestException,
    ConflictException,
    EntityNotFoundException,
)
from app.core.security import hash_password
from app.models.audit import AuditEvent, StatusHistory
from app.models.complaint import AIPrediction, Complaint
from app.models.enums import AuditActionType, CivicCategory, ComplaintStatus, UserRole
from app.models.user import Department, User
from app.schemas.admin import (
    AdminAnalyticsResponse,
    AdminUserUpdateRequest,
    DepartmentWorkloadStat,
    OfficerProvisionRequest,
)
from app.schemas.auth import UserResponse
from app.schemas.complaint import ComplaintDetailResponse, ComplaintOverrideRequest
from app.services.complaint_service import complaint_service

router = APIRouter(prefix="/admin", tags=["Administrator Console"])


@router.get("/analytics", response_model=AdminAnalyticsResponse)
async def get_system_analytics(
    current_admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Aggregate real-time database metrics for admin dashboard."""
    # 1. Status breakdown
    status_query = select(Complaint.status, func.count(Complaint.id)).group_by(Complaint.status)
    status_rows = (await db.execute(status_query)).all()
    status_map = {r[0]: r[1] for r in status_rows}

    total_complaints = sum(status_map.values())
    sub_count = status_map.get(ComplaintStatus.SUBMITTED, 0)
    rev_count = status_map.get(ComplaintStatus.UNDER_REVIEW, 0)
    ass_count = status_map.get(ComplaintStatus.ASSIGNED, 0)
    prog_count = status_map.get(ComplaintStatus.IN_PROGRESS, 0)
    res_count = status_map.get(ComplaintStatus.RESOLVED, 0)
    clo_count = status_map.get(ComplaintStatus.CLOSED, 0)

    # 2. Users breakdown
    user_query = select(User.role, func.count(User.id)).group_by(User.role)
    user_rows = (await db.execute(user_query)).all()
    user_map = {r[0]: r[1] for r in user_rows}
    total_users = sum(user_map.values())
    citizens_count = user_map.get(UserRole.CITIZEN, 0)
    officers_count = user_map.get(UserRole.OFFICER, 0)

    # 3. AI Overridden count
    override_query = select(func.count(AIPrediction.id)).where(AIPrediction.is_overridden == True)
    override_count = (await db.execute(override_query)).scalar() or 0

    # 4. Department workloads
    dept_stmt = select(Department).where(Department.is_active == True)
    departments = (await db.execute(dept_stmt)).scalars().all()

    workloads = []
    for dept in departments:
        dept_comp_stmt = (
            select(Complaint.status, func.count(Complaint.id))
            .where(Complaint.department_id == dept.id)
            .group_by(Complaint.status)
        )
        dept_counts = {r[0]: r[1] for r in (await db.execute(dept_comp_stmt)).all()}
        workloads.append(
            DepartmentWorkloadStat(
                department_id=dept.id,
                department_name=dept.name,
                department_code=dept.code,
                total_complaints=sum(dept_counts.values()),
                pending_complaints=dept_counts.get(ComplaintStatus.ASSIGNED, 0),
                in_progress_complaints=dept_counts.get(ComplaintStatus.IN_PROGRESS, 0),
                resolved_complaints=dept_counts.get(ComplaintStatus.RESOLVED, 0),
            )
        )

    return AdminAnalyticsResponse(
        total_complaints=total_complaints,
        submitted_count=sub_count,
        under_review_count=rev_count,
        assigned_count=ass_count,
        in_progress_count=prog_count,
        resolved_count=res_count,
        closed_count=clo_count,
        total_users=total_users,
        total_citizens=citizens_count,
        total_officers=officers_count,
        ai_overridden_count=override_count,
        department_workloads=workloads,
    )


@router.get("/complaints", response_model=List[ComplaintDetailResponse])
async def get_all_complaints(
    status_filter: Optional[ComplaintStatus] = Query(None),
    department_id: Optional[str] = Query(None),
    category: Optional[CivicCategory] = Query(None),
    search: Optional[str] = Query(None),
    current_admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Admin cross-department complaint management queue."""
    stmt = select(Complaint).order_by(desc(Complaint.created_at))

    if status_filter:
        stmt = stmt.where(Complaint.status == status_filter)
    if department_id:
        stmt = stmt.where(Complaint.department_id == department_id)
    if category:
        stmt = stmt.where(Complaint.category == category)
    if search:
        term = f"%{search.strip()}%"
        stmt = stmt.where(
            (Complaint.reference_number.ilike(term))
            | (Complaint.title.ilike(term))
            | (Complaint.description.ilike(term))
        )

    stmt = stmt.options(
        selectinload(Complaint.citizen),
        selectinload(Complaint.department),
        selectinload(Complaint.assigned_officer),
        selectinload(Complaint.attachments),
        selectinload(Complaint.ai_prediction),
        selectinload(Complaint.status_history),
        selectinload(Complaint.officer_notes),
    )

    complaints = (await db.execute(stmt)).scalars().all()
    return [complaint_to_detail_response(c, show_internal_notes=True) for c in complaints]


@router.get("/ai-review-queue", response_model=List[ComplaintDetailResponse])
async def get_ai_review_queue(
    current_admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Queue of complaints requiring manual AI prediction verification or low-confidence classification."""
    stmt = (
        select(Complaint)
        .join(AIPrediction, Complaint.id == AIPrediction.complaint_id)
        .where(
            (Complaint.status == ComplaintStatus.UNDER_REVIEW)
            | (AIPrediction.confidence_score < 0.80)
            | (AIPrediction.processing_status != "SUCCESS")
        )
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
    complaints = (await db.execute(stmt)).scalars().all()
    return [complaint_to_detail_response(c, show_internal_notes=True) for c in complaints]


@router.post("/complaints/{complaint_id}/override", response_model=ComplaintDetailResponse)
async def override_complaint_category_and_dept(
    complaint_id: str,
    data: ComplaintOverrideRequest,
    current_admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Admin override of AI prediction and department assignment."""
    complaint = await complaint_service.override_ai_prediction(
        db=db,
        complaint_id=complaint_id,
        admin_user=current_admin,
        new_category=data.category,
        new_department_id=data.department_id,
        reason=data.override_reason,
    )
    return complaint_to_detail_response(complaint, show_internal_notes=True)


@router.post("/complaints/{complaint_id}/assign")
async def assign_officer_to_complaint(
    complaint_id: str,
    officer_id: str,
    notes: Optional[str] = None,
    current_admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Assign an officer to a complaint."""
    complaint = await complaint_service.get_complaint_by_id(db, complaint_id)
    if not complaint:
        raise EntityNotFoundException("Complaint", complaint_id)

    officer_res = await db.execute(select(User).where(User.id == officer_id))
    officer = officer_res.scalar_one_or_none()
    if not officer or officer.role != UserRole.OFFICER:
        raise BadRequestException("Target user is not an active department officer.")

    complaint.assigned_officer_id = officer.id
    if complaint.status == ComplaintStatus.UNDER_REVIEW:
        complaint.status = ComplaintStatus.ASSIGNED

    history = StatusHistory(
        complaint_id=complaint.id,
        previous_status=complaint.status,
        new_status=complaint.status,
        actor_id=current_admin.id,
        actor_name=current_admin.full_name,
        actor_role="ADMIN",
        notes=f"Officer assigned: {officer.full_name}. Notes: {notes or 'Assigned by administrator'}",
    )
    db.add(history)
    await db.commit()
    await db.refresh(complaint)
    return {"message": f"Assigned to {officer.full_name}"}


@router.get("/users", response_model=List[UserResponse])
async def list_users(
    role: Optional[UserRole] = Query(None),
    department_id: Optional[str] = Query(None),
    current_admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """List registered users with optional role and department filtering."""
    stmt = select(User).order_by(desc(User.created_at)).options(selectinload(User.department))
    if role:
        stmt = stmt.where(User.role == role)
    if department_id:
        stmt = stmt.where(User.department_id == department_id)

    users = (await db.execute(stmt)).scalars().all()
    return [user_to_response(u) for u in users]


@router.post("/provision-officer", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def provision_officer(
    data: OfficerProvisionRequest,
    current_admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Provision a new department officer account."""
    existing = await db.execute(select(User).where(User.email == data.email.lower()))
    if existing.scalar_one_or_none():
        raise ConflictException("An account with this email address already exists.")

    dept = (await db.execute(select(Department).where(Department.id == data.department_id))).scalar_one_or_none()
    if not dept:
        raise EntityNotFoundException("Department", data.department_id)

    officer = User(
        email=data.email.lower(),
        hashed_password=hash_password(data.password),
        full_name=data.full_name.strip(),
        phone_number=data.phone_number,
        role=UserRole.OFFICER,
        department_id=dept.id,
        is_active=True,
    )
    db.add(officer)
    await db.flush()

    audit = AuditEvent(
        entity_type="USER",
        entity_id=officer.id,
        action_type=AuditActionType.USER_PROVISIONED,
        actor_id=current_admin.id,
        actor_email=current_admin.email,
        details={"officer_email": officer.email, "department_code": dept.code},
    )
    db.add(audit)

    await db.commit()
    await db.refresh(officer)
    return user_to_response(officer)


@router.patch("/users/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: str,
    data: AdminUserUpdateRequest,
    current_admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Update user status or department."""
    user = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
    if not user:
        raise EntityNotFoundException("User", user_id)

    if data.full_name is not None:
        user.full_name = data.full_name
    if data.role is not None:
        user.role = data.role
    if data.department_id is not None:
        user.department_id = data.department_id
    if data.is_active is not None:
        user.is_active = data.is_active

    await db.commit()
    await db.refresh(user)
    return user_to_response(user)


@router.get("/audit-logs")
async def get_audit_logs(
    limit: int = Query(50, ge=1, le=200),
    current_admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve immutable audit events for security and compliance reviews."""
    stmt = select(AuditEvent).order_by(desc(AuditEvent.created_at)).limit(limit)
    logs = (await db.execute(stmt)).scalars().all()
    return [
        {
            "id": l.id,
            "entity_type": l.entity_type,
            "entity_id": l.entity_id,
            "action_type": l.action_type.value,
            "actor_id": l.actor_id,
            "actor_email": l.actor_email,
            "details": l.details,
            "ip_address": l.ip_address,
            "created_at": l.created_at,
        }
        for l in logs
    ]
