import io
from typing import Optional
from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.core.dependencies import get_current_user, get_db, get_optional_user
from app.core.exceptions import (
    BadRequestException,
    EntityNotFoundException,
    ForbiddenException,
)
from app.models.complaint import Complaint, ComplaintAttachment
from app.models.enums import UserRole
from app.models.user import User
from app.services.storage_service import storage_service

router = APIRouter(prefix="/files", tags=["File Storage"])


@router.get("/download")
async def download_file(
    path: str = Query(...),
    current_user: Optional[User] = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
):
    """Securely stream private attachments with strict object-level authorization."""
    # Sanitize path
    clean_path = path.strip().replace("\\", "/")
    if ".." in clean_path or clean_path.startswith("/"):
        raise BadRequestException("Invalid storage path key.", error_code="PATH_TRAVERSAL_DETECTED")

    # Locate attachment in database
    stmt = (
        select(ComplaintAttachment)
        .where(ComplaintAttachment.storage_path == clean_path)
        .options(selectinload(ComplaintAttachment.complaint))
    )
    res = await db.execute(stmt)
    attachment = res.scalar_one_or_none()

    if not attachment:
        raise EntityNotFoundException("File attachment", clean_path)

    # Authorization Check
    complaint = attachment.complaint
    if not current_user:
        # Unauthenticated users cannot view private evidence directly without public tracking view
        raise ForbiddenException("Authentication required to access private evidence.")

    if current_user.role == UserRole.CITIZEN:
        if complaint.user_id != current_user.id:
            raise ForbiddenException("You are not authorized to view this attachment.")

    if current_user.role == UserRole.OFFICER:
        if complaint.department_id != current_user.department_id:
            raise ForbiddenException("Officers cannot access attachments from outside their department.")

    # Read binary bytes
    file_bytes = await storage_service.read_file_bytes(clean_path)
    if not file_bytes:
        raise EntityNotFoundException("File binary not found in storage", clean_path)

    media_type = attachment.content_type or "image/jpeg"
    return Response(content=file_bytes, media_type=media_type)


@router.get("/signed-url")
async def get_signed_url(
    path: str = Query(...),
    expires_in: int = Query(default=300, ge=60, le=3600),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Generate a time-limited signed download URL with strict object-level authorization."""
    clean_path = path.strip().replace("\\", "/")
    if ".." in clean_path or clean_path.startswith("/"):
        raise BadRequestException("Invalid storage path key.", error_code="PATH_TRAVERSAL_DETECTED")

    # Locate attachment in database
    stmt = (
        select(ComplaintAttachment)
        .where(ComplaintAttachment.storage_path == clean_path)
        .options(selectinload(ComplaintAttachment.complaint))
    )
    res = await db.execute(stmt)
    attachment = res.scalar_one_or_none()

    if not attachment:
        raise EntityNotFoundException("File attachment", clean_path)

    complaint = attachment.complaint
    if current_user.role == UserRole.CITIZEN:
        if complaint.user_id != current_user.id:
            raise ForbiddenException("You are not authorized to view this attachment.")

    if current_user.role == UserRole.OFFICER:
        if complaint.department_id != current_user.department_id:
            raise ForbiddenException("Officers cannot access attachments from outside their department.")

    signed_url = await storage_service.get_signed_url_or_token(clean_path, expires_in=expires_in)
    if not signed_url:
        raise EntityNotFoundException("Signed URL could not be generated for storage path", clean_path)

    return {
        "storage_path": clean_path,
        "signed_url": signed_url,
        "expires_in": expires_in,
    }
