"""
Pydantic models for Report generation
"""

from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import date, datetime
from uuid import UUID
from enum import Enum


class ReportType(str, Enum):
    """Report type"""
    PRE_EXAM = "pre_exam"
    IME = "ime"
    ADDENDUM = "addendum"
    SUPPLEMENTAL = "supplemental"


class ReportStatus(str, Enum):
    """Report status"""
    DRAFT = "draft"
    REVIEW = "review"
    FINALIZED = "finalized"
    SENT = "sent"


class ReportBase(BaseModel):
    """Base report model"""
    report_type: Optional[ReportType] = ReportType.IME
    report_date: Optional[date] = None


class ReportCreate(ReportBase):
    """Create report request"""
    case_id: UUID
    template_id: Optional[UUID] = None


class ReportUpdate(BaseModel):
    """Update report"""
    report_date: Optional[date] = None
    status: Optional[ReportStatus] = None
    content: Optional[Dict[str, Any]] = None


class Report(ReportBase):
    """Complete report model"""
    id: UUID
    case_id: UUID
    status: ReportStatus
    finalized_date: Optional[date] = None
    sent_date: Optional[date] = None
    primary_author_id: Optional[UUID] = None
    reviewed_by_id: Optional[UUID] = None
    content: Optional[Dict[str, Any]] = None
    pdf_path: Optional[str] = None
    docx_path: Optional[str] = None
    created_by: Optional[UUID] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class ReportSectionBase(BaseModel):
    """Base report section"""
    section_type: str
    section_title: str
    content: str


class ReportSectionCreate(ReportSectionBase):
    """Create report section"""
    report_id: UUID
    section_order: int
    is_auto_generated: bool = False
    source_data: Optional[Dict[str, Any]] = None


class ReportSection(ReportSectionBase):
    """Complete report section"""
    id: UUID
    report_id: UUID
    section_order: int
    is_auto_generated: bool
    source_data: Optional[Dict[str, Any]] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class ReportDetail(Report):
    """Report with all sections"""
    sections: List[ReportSection] = []


class ReportFinalizeRequest(BaseModel):
    """Finalize report request"""
    reviewed_by_id: Optional[UUID] = None


class ReportGeneratePDFRequest(BaseModel):
    """Generate PDF request"""
    include_attachments: bool = False
