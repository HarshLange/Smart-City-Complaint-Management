from datetime import datetime
from typing import Dict, List, Optional
from pydantic import BaseModel, ConfigDict, EmailStr, Field
from app.models.enums import UserRole


class OfficerProvisionRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8)
    full_name: str = Field(..., min_length=2, max_length=100)
    phone_number: Optional[str] = None
    department_id: str


class AdminUserUpdateRequest(BaseModel):
    full_name: Optional[str] = None
    role: Optional[UserRole] = None
    department_id: Optional[str] = None
    is_active: Optional[bool] = None


class DepartmentWorkloadStat(BaseModel):
    department_id: str
    department_name: str
    department_code: str
    total_complaints: int
    pending_complaints: int
    in_progress_complaints: int
    resolved_complaints: int


class AdminAnalyticsResponse(BaseModel):
    total_complaints: int
    submitted_count: int
    under_review_count: int
    assigned_count: int
    in_progress_count: int
    resolved_count: int
    closed_count: int
    total_users: int
    total_citizens: int
    total_officers: int
    ai_overridden_count: int
    department_workloads: List[DepartmentWorkloadStat]


class NotificationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    complaint_id: Optional[str] = None
    title: str
    message: str
    notification_type: str
    is_read: bool
    created_at: datetime
