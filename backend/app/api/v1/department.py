from typing import List, Optional
from fastapi import APIRouter, Depends, File, Form, Query, Request, UploadFile, status
from pydantic import BaseModel
from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.api.v1.complaints import complaint_to_detail_response
from app.core.dependencies import get_db, require_officer
from app.core.exceptions import BadRequestException, ForbiddenException
from app.models.complaint import Complaint
from app.models.enums import ComplaintStatus, UserRole
from app.models.user import Department, User
from app.schemas.complaint import (
    ComplaintAttachmentResponse,
    ComplaintDetailResponse,
    ComplaintStatusUpdateRequest,
    OfficerNoteCreateRequest,
    OfficerNoteResponse,
)
from app.schemas.department import DepartmentResponse
from app.services.complaint_service import complaint_service

router = APIRouter(prefix="/department", tags=["Department Workspace"])


@router.get("/departments", response_model=List[DepartmentResponse])
async def list_departments(db: AsyncSession = Depends(get_db)):
    """List all active departments."""
    res = await db.execute(select(Department).where(Department.is_active == True))
    depts = res.scalars().all()
    out = []
    for d in depts:
        out.append(
            DepartmentResponse(
                id=d.id,
                code=d.code,
                name=d.name,
                description=d.description,
                contact_email=d.contact_email,
                is_active=d.is_active,
                created_at=d.created_at,
            )
        )
    return out


@router.get("/queue", response_model=List[ComplaintDetailResponse])
async def get_department_complaint_queue(
    status_filter: Optional[ComplaintStatus] = Query(None),
    search: Optional[str] = Query(None),
    current_user: User = Depends(require_officer),
    db: AsyncSession = Depends(get_db),
):
    """Department officer complaint queue with strict department scoping."""
    if current_user.role == UserRole.OFFICER and not current_user.department_id:
        raise ForbiddenException("Officer account is not assigned to any municipal department.")

    stmt = select(Complaint).order_by(desc(Complaint.created_at))

    # Apply Department Scoping for Officers
    if current_user.role == UserRole.OFFICER:
        stmt = stmt.where(Complaint.department_id == current_user.department_id)

    if status_filter:
        stmt = stmt.where(Complaint.status == status_filter)

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

    res = await db.execute(stmt)
    complaints = res.scalars().all()
    return [complaint_to_detail_response(c, show_internal_notes=True) for c in complaints]


@router.get("/summary")
async def get_department_workload_summary(
    current_user: User = Depends(require_officer),
    db: AsyncSession = Depends(get_db),
):
    """Get active workload statistics for the officer's department."""
    dept_id = current_user.department_id
    if not dept_id and current_user.role == UserRole.OFFICER:
        raise ForbiddenException("Officer account is not assigned to any department.")

    stmt = select(Complaint.status, func.count(Complaint.id)).group_by(Complaint.status)
    if current_user.role == UserRole.OFFICER:
        stmt = stmt.where(Complaint.department_id == dept_id)

    res = await db.execute(stmt)
    counts = {s.value: 0 for s in ComplaintStatus}
    for row in res.all():
        counts[row[0].value] = row[1]

    return {
        "department_id": dept_id,
        "counts_by_status": counts,
        "total_active": (
            counts.get(ComplaintStatus.ASSIGNED.value, 0)
            + counts.get(ComplaintStatus.IN_PROGRESS.value, 0)
            + counts.get(ComplaintStatus.UNDER_REVIEW.value, 0)
        ),
        "total_resolved": counts.get(ComplaintStatus.RESOLVED.value, 0),
    }


@router.patch("/complaints/{complaint_id}/status", response_model=ComplaintDetailResponse)
async def update_complaint_status(
    complaint_id: str,
    data: ComplaintStatusUpdateRequest,
    current_user: User = Depends(require_officer),
    db: AsyncSession = Depends(get_db),
):
    """Update complaint status within officer's authorized department."""
    complaint = await complaint_service.update_status(
        db=db,
        complaint_id=complaint_id,
        new_status=data.new_status,
        actor=current_user,
        notes=data.notes,
        resolution_notes=data.notes if data.new_status == ComplaintStatus.RESOLVED else None,
    )
    return complaint_to_detail_response(complaint, show_internal_notes=True)


@router.post("/complaints/{complaint_id}/notes", response_model=OfficerNoteResponse)
async def add_officer_note(
    complaint_id: str,
    data: OfficerNoteCreateRequest,
    current_user: User = Depends(require_officer),
    db: AsyncSession = Depends(get_db),
):
    """Add internal officer notes to a complaint."""
    note = await complaint_service.add_officer_note(
        db=db,
        complaint_id=complaint_id,
        officer=current_user,
        note_text=data.note_text,
        is_internal=data.is_internal,
    )
    return OfficerNoteResponse(
        id=note.id,
        officer_name=note.officer_name,
        note_text=note.note_text,
        is_internal=note.is_internal,
        created_at=note.created_at,
    )


@router.post("/complaints/{complaint_id}/evidence", response_model=ComplaintAttachmentResponse)
async def upload_resolution_evidence(
    complaint_id: str,
    file: UploadFile = File(...),
    current_user: User = Depends(require_officer),
    db: AsyncSession = Depends(get_db),
):
    """Upload resolution photo evidence."""
    file_bytes = await file.read()
    filename = file.filename or "evidence.jpg"
    content_type = file.content_type or "image/jpeg"

    att = await complaint_service.add_resolution_evidence(
        db=db,
        complaint_id=complaint_id,
        officer=current_user,
        file_bytes=file_bytes,
        filename=filename,
        content_type=content_type,
    )

    return ComplaintAttachmentResponse(
        id=att.id,
        storage_path=att.storage_path,
        filename=att.filename,
        content_type=att.content_type,
        file_size_bytes=att.file_size_bytes,
        is_resolution_evidence=True,
        created_at=att.created_at,
        access_url=f"/api/v1/files/download?path={att.storage_path}",
    )
