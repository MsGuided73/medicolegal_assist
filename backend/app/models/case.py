"""
Pydantic models for Case management
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import date, datetime
from uuid import UUID
from enum import Enum


class CaseStatus(str, Enum):
    """Case status enumeration"""
    OPEN = "open"
    IN_PROGRESS = "in_progress"
    REVIEW = "review"
    COMPLETED = "completed"
    ARCHIVED = "archived"


class CasePriority(str, Enum):
    """Case priority enumeration"""
    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"
    URGENT = "urgent"


class CaseBase(BaseModel):
    """Base case model"""
    patient_first_name: str
    patient_last_name: str
    patient_dob: Optional[date] = None
    patient_ssn_last4: Optional[str] = Field(None, max_length=4)
    injury_date: Optional[date] = None
    injury_mechanism: Optional[str] = None
    injury_body_region: Optional[List[str]] = []
    requesting_party: Optional[str] = None
    exam_date: Optional[date] = None
    report_due_date: Optional[date] = None
    priority: Optional[CasePriority] = CasePriority.NORMAL
    notes: Optional[str] = None
    tags: Optional[List[str]] = []


class CaseCreate(CaseBase):
    """Create case request"""
    pass


class CaseUpdate(BaseModel):
    """Update case request (all fields optional)"""
    patient_first_name: Optional[str] = None
    patient_last_name: Optional[str] = None
    patient_dob: Optional[date] = None
    injury_date: Optional[date] = None
    injury_mechanism: Optional[str] = None
    injury_body_region: Optional[List[str]] = None
    requesting_party: Optional[str] = None
    exam_date: Optional[date] = None
    report_due_date: Optional[date] = None
    priority: Optional[CasePriority] = None
    notes: Optional[str] = None
    tags: Optional[List[str]] = None


class Case(CaseBase):
    """Complete case model (response)"""
    id: UUID
    case_number: str
    status: CaseStatus
    assigned_physician_id: Optional[UUID] = None
    assigned_assistant_id: Optional[UUID] = None
    created_by: UUID
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class CaseAssignment(BaseModel):
    """Assign case to user"""
    user_id: UUID
    role: str  # physician, medical_assistant


class CaseStatusChange(BaseModel):
    """Change case status"""
    new_status: CaseStatus
    notes: Optional[str] = None
