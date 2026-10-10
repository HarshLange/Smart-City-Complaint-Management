from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field
from app.models.enums import CivicCategory, ComplaintStatus


class ComplaintAttachmentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    storage_path: str
    filename: str
    content_type: str
    file_size_bytes: int
    is_resolution_evidence: bool
    created_at: datetime
    access_url: Optional[str] = None


class AIPredictionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    model_name: str
    model_version: str
    predicted_category: str
    confidence_score: float
    all_probabilities: Dict[str, Any]
    suggested_department_code: str
    processing_status: str
    error_message: Optional[str] = None
    is_overridden: bool = False
    override_reason: Optional[str] = None


class StatusHistoryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    previous_status: ComplaintStatus
    new_status: ComplaintStatus
    actor_name: str
    actor_role: str
    notes: Optional[str] = None
    created_at: datetime


class OfficerNoteResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    officer_name: str
    note_text: str
    is_internal: bool
    created_at: datetime


class ComplaintCreateResponse(BaseModel):
    id: str
    reference_number: str
    tracking_pin: str  # Displayed once upon submission for public tracking
    title: str
    status: ComplaintStatus
    category: CivicCategory
    department_code: Optional[str] = None
    department_name: Optional[str] = None
    confidence_score: Optional[float] = None
    needs_review: bool
    message: str


class ComplaintDetailResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    reference_number: str
    title: str
    description: str
    status: ComplaintStatus
    category: CivicCategory
    priority: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    address: Optional[str] = None
    landmark: Optional[str] = None
    resolution_notes: Optional[str] = None
    resolved_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    # Associated Department
    department_id: Optional[str] = None
    department_name: Optional[str] = None
    department_code: Optional[str] = None

    # Citizen details (visible only to officer/admin or owner)
    user_id: Optional[str] = None
    citizen_name: Optional[str] = None
    citizen_email: Optional[str] = None

    # Assigned Officer
    assigned_officer_id: Optional[str] = None
    assigned_officer_name: Optional[str] = None

    # Related entities
    attachments: List[ComplaintAttachmentResponse] = []
    ai_prediction: Optional[AIPredictionResponse] = None
    status_history: List[StatusHistoryResponse] = []
    officer_notes: List[OfficerNoteResponse] = []


class ComplaintPublicTrackingResponse(BaseModel):
    """Sanitized public DTO containing zero PII or private storage details."""
    reference_number: str
    title: str
    status: ComplaintStatus
    category: CivicCategory
    department_name: Optional[str] = None
    priority: str
    address_summary: Optional[str] = None
    landmark: Optional[str] = None
    resolution_notes: Optional[str] = None
    created_at: datetime
    resolved_at: Optional[datetime] = None
    status_timeline: List[StatusHistoryResponse] = []


class ComplaintStatusUpdateRequest(BaseModel):
    new_status: ComplaintStatus
    notes: Optional[str] = Field(None, max_length=1000)


class ComplaintOverrideRequest(BaseModel):
    category: CivicCategory
    department_id: str
    override_reason: str = Field(..., min_length=5, max_length=500)


class ComplaintAssignOfficerRequest(BaseModel):
    officer_id: str
    notes: Optional[str] = None


class OfficerNoteCreateRequest(BaseModel):
    note_text: str = Field(..., min_length=2, max_length=2000)
    is_internal: bool = True
