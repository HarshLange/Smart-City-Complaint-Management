from datetime import datetime
from typing import TYPE_CHECKING, Any, Dict, List, Optional
from sqlalchemy import (
    Boolean,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Integer,
    JSON,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base, TimestampMixin, generate_uuid
from app.models.enums import CivicCategory, ComplaintStatus

if TYPE_CHECKING:
    from app.models.audit import OfficerNote, StatusHistory
    from app.models.user import Department, User


class Complaint(Base, TimestampMixin):
    __tablename__ = "complaints"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    reference_number: Mapped[str] = mapped_column(
        String(30), unique=True, index=True, nullable=False
    )
    tracking_pin_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    user_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[ComplaintStatus] = mapped_column(
        Enum(ComplaintStatus), default=ComplaintStatus.SUBMITTED, nullable=False, index=True
    )
    category: Mapped[CivicCategory] = mapped_column(
        Enum(CivicCategory), default=CivicCategory.OTHER, nullable=False, index=True
    )
    department_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("departments.id", ondelete="SET NULL"), nullable=True, index=True
    )
    assigned_officer_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    priority: Mapped[str] = mapped_column(String(20), default="MEDIUM", nullable=False)
    
    # Location coordinates & address
    latitude: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    longitude: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    address: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    landmark: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)

    # Resolution outcome
    resolution_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    resolved_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    citizen: Mapped[Optional["User"]] = relationship(
        "User", foreign_keys=[user_id], back_populates="complaints_created"
    )
    assigned_officer: Mapped[Optional["User"]] = relationship(
        "User", foreign_keys=[assigned_officer_id], back_populates="complaints_assigned"
    )
    department: Mapped[Optional["Department"]] = relationship(
        "Department", back_populates="complaints"
    )
    attachments: Mapped[List["ComplaintAttachment"]] = relationship(
        "ComplaintAttachment", back_populates="complaint", cascade="all, delete-orphan"
    )
    ai_prediction: Mapped[Optional["AIPrediction"]] = relationship(
        "AIPrediction", back_populates="complaint", uselist=False, cascade="all, delete-orphan"
    )
    status_history: Mapped[List["StatusHistory"]] = relationship(
        "StatusHistory", back_populates="complaint", cascade="all, delete-orphan", order_by="StatusHistory.created_at.desc()"
    )
    officer_notes: Mapped[List["OfficerNote"]] = relationship(
        "OfficerNote", back_populates="complaint", cascade="all, delete-orphan", order_by="OfficerNote.created_at.desc()"
    )


class ComplaintAttachment(Base, TimestampMixin):
    __tablename__ = "complaint_attachments"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    complaint_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("complaints.id", ondelete="CASCADE"), nullable=False, index=True
    )
    storage_path: Mapped[str] = mapped_column(String(500), nullable=False)
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    content_type: Mapped[str] = mapped_column(String(100), nullable=False)
    file_size_bytes: Mapped[int] = mapped_column(Integer, nullable=False)
    is_resolution_evidence: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    uploaded_by_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    complaint: Mapped["Complaint"] = relationship("Complaint", back_populates="attachments")


class AIPrediction(Base, TimestampMixin):
    __tablename__ = "ai_predictions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    complaint_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("complaints.id", ondelete="CASCADE"), unique=True, nullable=False, index=True
    )
    model_name: Mapped[str] = mapped_column(String(100), default="ResNet18 + BiLSTM + Attention", nullable=False)
    model_version: Mapped[str] = mapped_column(String(50), default="TP100-epoch47", nullable=False)
    predicted_category: Mapped[str] = mapped_column(String(50), nullable=False)
    confidence_score: Mapped[float] = mapped_column(Float, nullable=False)
    all_probabilities: Mapped[Dict[str, Any]] = mapped_column(JSON, nullable=False)
    suggested_department_code: Mapped[str] = mapped_column(String(50), nullable=False)
    processing_status: Mapped[str] = mapped_column(String(50), nullable=False)  # SUCCESS, LOW_CONFIDENCE, FAILED
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Human administrator override audit
    is_overridden: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    overridden_by_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    override_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    complaint: Mapped["Complaint"] = relationship("Complaint", back_populates="ai_prediction")
