"""
Pydantic models for Physical Examinations
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import date, datetime
from uuid import UUID
from enum import Enum


class ReliabilityLevel(str, Enum):
    """Patient reliability"""
    RELIABLE = "reliable"
    QUESTIONABLE = "questionable"
    UNRELIABLE = "unreliable"


class ExamStatus(str, Enum):
    """Examination status"""
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    REVIEWED = "reviewed"


class Side(str, Enum):
    """Body side"""
    LEFT = "left"
    RIGHT = "right"
    BILATERAL = "bilateral"


class TestResult(str, Enum):
    """Special test result"""
    POSITIVE = "positive"
    NEGATIVE = "negative"
    EQUIVOCAL = "equivocal"


# ============================================================================
# EXAMINATION
# ============================================================================

class ExaminationBase(BaseModel):
    """Base examination model"""
    exam_date: date
    exam_location: Optional[str] = None
    patient_demeanor: Optional[str] = None
    reliability: Optional[ReliabilityLevel] = None
    physician_notes: Optional[str] = None


class ExaminationCreate(ExaminationBase):
    """Create examination request"""
    case_id: UUID


class ExaminationUpdate(BaseModel):
    """Update examination (all optional)"""
    exam_date: Optional[date] = None
    exam_location: Optional[str] = None
    patient_demeanor: Optional[str] = None
    reliability: Optional[ReliabilityLevel] = None
    physician_notes: Optional[str] = None
    status: Optional[ExamStatus] = None


class Examination(ExaminationBase):
    """Complete examination model"""
    id: UUID
    case_id: UUID
    examining_physician_id: Optional[UUID] = None
    status: ExamStatus
    created_by: Optional[UUID] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


# ============================================================================
# RANGE OF MOTION
# ============================================================================

class ROMMeasurementBase(BaseModel):
    """Base ROM measurement"""
    body_region: str
    joint: str
    movement: str
    side: Optional[Side] = None
    active_rom: Optional[int] = Field(None, ge=0, le=360)
    passive_rom: Optional[int] = Field(None, ge=0, le=360)
    normal_rom: Optional[int] = Field(None, ge=0, le=360)
    pain_on_movement: bool = False
    pain_level: Optional[int] = Field(None, ge=0, le=10)
    end_feel: Optional[str] = None
    notes: Optional[str] = None


class ROMMeasurementCreate(ROMMeasurementBase):
    """Create ROM measurement"""
    examination_id: UUID


class ROMMeasurement(ROMMeasurementBase):
    """Complete ROM measurement"""
    id: UUID
    examination_id: UUID
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


# ============================================================================
# STRENGTH TESTING
# ============================================================================

class StrengthTestBase(BaseModel):
    """Base strength test"""
    body_region: str
    muscle_group: str
    side: Optional[Side] = None
    strength_grade: Optional[float] = Field(None, ge=0, le=5)
    strength_description: Optional[str] = None
    pain_on_testing: bool = False
    pain_level: Optional[int] = Field(None, ge=0, le=10)
    notes: Optional[str] = None


class StrengthTestCreate(StrengthTestBase):
    """Create strength test"""
    examination_id: UUID


class StrengthTest(StrengthTestBase):
    """Complete strength test"""
    id: UUID
    examination_id: UUID
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


# ============================================================================
# SPECIAL TESTS
# ============================================================================

class SpecialTestBase(BaseModel):
    """Base special test"""
    test_name: str
    body_region: str
    side: Optional[Side] = None
    result: Optional[TestResult] = None
    findings: Optional[str] = None
    notes: Optional[str] = None


class SpecialTestCreate(SpecialTestBase):
    """Create special test"""
    examination_id: UUID


class SpecialTest(SpecialTestBase):
    """Complete special test"""
    id: UUID
    examination_id: UUID
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


# ============================================================================
# COMBINED EXAMINATION DATA
# ============================================================================

class ExaminationDetail(Examination):
    """Examination with all measurements"""
    rom_measurements: List[ROMMeasurement] = []
    strength_tests: List[StrengthTest] = []
    special_tests: List[SpecialTest] = []
