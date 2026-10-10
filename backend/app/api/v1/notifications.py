from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy import desc, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.dependencies import get_current_user, get_db
from app.core.exceptions import EntityNotFoundException
from app.models.notification import Notification
from app.models.user import User
from app.schemas.admin import NotificationResponse

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get("/", response_model=List[NotificationResponse])
async def get_my_notifications(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve notifications for authenticated user."""
    stmt = (
        select(Notification)
        .where(Notification.user_id == current_user.id)
        .order_by(desc(Notification.created_at))
        .limit(30)
    )
    res = await db.execute(stmt)
    return res.scalars().all()


@router.patch("/{notification_id}/read")
async def mark_notification_read(
    notification_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Mark a specific notification as read."""
    res = await db.execute(
        select(Notification).where(
            Notification.id == notification_id,
            Notification.user_id == current_user.id,
        )
    )
    notif = res.scalar_one_or_none()
    if not notif:
        raise EntityNotFoundException("Notification", notification_id)

    notif.is_read = True
    await db.commit()
    return {"message": "Notification marked as read"}


@router.post("/read-all")
async def mark_all_read(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Mark all notifications as read."""
    await db.execute(
        update(Notification)
        .where(Notification.user_id == current_user.id)
        .values(is_read=True)
    )
    await db.commit()
    return {"message": "All notifications marked as read"}
