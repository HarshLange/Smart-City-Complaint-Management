from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, EmailStr, Field


class DepartmentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    code: str
    name: str
    description: str
    contact_email: str
    is_active: bool
    officer_count: int = 0
    active_complaints_count: int = 0
    created_at: datetime


class DepartmentCreateRequest(BaseModel):
    code: str = Field(..., min_length=2, max_length=50)
    name: str = Field(..., min_length=2, max_length=100)
    description: str = Field(..., min_length=5)
    contact_email: EmailStr


class DepartmentUpdateRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    contact_email: Optional[EmailStr] = None
    is_active: Optional[bool] = None
