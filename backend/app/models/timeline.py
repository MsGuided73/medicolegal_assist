"""
Pydantic models for Medical Timeline
"""

from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime
from uuid import UUID
from enum import Enum


class EventSourceType(str, Enum):
    """Timeline event source"""
    DOCUMENT = "document"
    EXAMINATION = "examination"
    MANUAL = "manual"


class EventSeverity(str, Enum):
    """Event severity"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class TimelineEventBase(BaseModel):
    """Base timeline event"""
    event_date: date
    event_type: str
    title: str
    description: Optional[str] = None
    category: Optional[str] = None
    severity: Optional[EventSeverity] = EventSeverity.LOW
    is_milestone: bool = False


class TimelineEventCreate(TimelineEventBase):
    """Create timeline event"""
    case_id: UUID
    source_type: Optional[EventSourceType] = EventSourceType.MANUAL
    source_id: Optional[UUID] = None


class TimelineEvent(TimelineEventBase):
    """Complete timeline event"""
    id: UUID
    case_id: UUID
    source_type: EventSourceType
    source_id: Optional[UUID] = None
    icon: Optional[str] = None
    color: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True
