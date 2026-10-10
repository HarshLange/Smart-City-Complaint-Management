from typing import TYPE_CHECKING, Any, Dict, Optional
from sqlalchemy import Boolean, Enum, ForeignKey, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base, TimestampMixin, generate_uuid
from app.models.enums import AuditActionType, ComplaintStatus

if TYPE_CHECKING:
    from app.models.complaint import Complaint
    from app.models.user import User


class StatusHistory(Base, TimestampMixin):
    __tablename__ = "status_histories"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    complaint_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("complaints.id", ondelete="CASCADE"), nullable=False, index=True
    )
    previous_status: Mapped[ComplaintStatus] = mapped_column(
        Enum(ComplaintStatus), nullable=False
    )
    new_status: Mapped[ComplaintStatus] = mapped_column(
        Enum(ComplaintStatus), nullable=False
    )
    actor_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    actor_name: Mapped[str] = mapped_column(String(100), nullable=False)
    actor_role: Mapped[str] = mapped_column(String(50), nullable=False)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    complaint: Mapped["Complaint"] = relationship("Complaint", back_populates="status_history")


class OfficerNote(Base, TimestampMixin):
    __tablename__ = "officer_notes"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    complaint_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("complaints.id", ondelete="CASCADE"), nullable=False, index=True
    )
    officer_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    officer_name: Mapped[str] = mapped_column(String(100), nullable=False)
    note_text: Mapped[str] = mapped_column(Text, nullable=False)
    is_internal: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    complaint: Mapped["Complaint"] = relationship("Complaint", back_populates="officer_notes")


class AuditEvent(Base, TimestampMixin):
    __tablename__ = "audit_events"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    entity_type: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    entity_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    action_type: Mapped[AuditActionType] = mapped_column(
        Enum(AuditActionType), nullable=False, index=True
    )
    actor_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    actor_email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    details: Mapped[Dict[str, Any]] = mapped_column(JSON, nullable=False)
    ip_address: Mapped[Optional[str]] = mapped_column(String(45), nullable=True)
