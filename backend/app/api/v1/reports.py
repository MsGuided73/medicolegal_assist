"""
Reports API Router
RESTful endpoints for IME report generation
"""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from typing import List
from uuid import UUID

from app.models.report import (
    Report, ReportCreate, ReportUpdate, ReportDetail,
    ReportSection, ReportSectionCreate,
    ReportFinalizeRequest, ReportGeneratePDFRequest
)
from app.services.report_service import ReportService
from app.api.dependencies import get_current_user

router = APIRouter(prefix="/reports", tags=["reports"])


@router.post("", response_model=Report, status_code=status.HTTP_201_CREATED)
async def create_report(
    report_data: ReportCreate,
    current_user: dict = Depends(get_current_user)
):
    """
    Create a new IME report
    
    - **case_id**: ID of the case
    - **report_type**: ime, addendum, or supplemental
    - **template_id**: Optional template to apply
    """
    service = ReportService()
    
    try:
        report = await service.create_report(
            report_data=report_data,
            created_by=UUID(current_user["id"])
        )
        return report
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create report: {str(e)}"
        )


@router.get("/{report_id}", response_model=ReportDetail)
async def get_report(
    report_id: UUID,
    current_user: dict = Depends(get_current_user)
):
    """
    Get report with all sections
    """
    service = ReportService()
    
    report = await service.get_report(
        report_id=report_id,
        user_id=UUID(current_user["id"])
    )
    
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Report {report_id} not found"
        )
    
    return report


@router.put("/{report_id}", response_model=Report)
async def update_report(
    report_id: UUID,
    report_data: ReportUpdate,
    current_user: dict = Depends(get_current_user)
):
    """
    Update report metadata
    """
    service = ReportService()
    
    # TODO: Implement update logic
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Report update not yet implemented"
    )


@router.post("/{report_id}/sections", response_model=ReportSection)
async def add_report_section(
    report_id: UUID,
    section_data: ReportSectionCreate,
    current_user: dict = Depends(get_current_user)
):
    """
    Add a section to the report
    
    - **section_type**: Type of section
    - **section_title**: Section title
    - **section_order**: Order in report
    - **content**: Section content (markdown supported)
    """
    service = ReportService()
    
    section_data.report_id = report_id
    
    try:
        section = await service.add_section(
            section_data=section_data,
            user_id=UUID(current_user["id"])
        )
        return section
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to add section: {str(e)}"
        )


@router.post("/{report_id}/auto-generate", response_model=List[ReportSection])
async def auto_generate_sections(
    report_id: UUID,
    case_id: UUID,
    current_user: dict = Depends(get_current_user)
):
    """
    Auto-generate report sections from case data
    
    Generates:
    - Patient Information
    - Medical History (from extracted entities)
    - Physical Examination (if completed)
    """
    service = ReportService()
    
    try:
        sections = await service.auto_generate_sections(
            report_id=report_id,
            case_id=case_id,
            user_id=UUID(current_user["id"])
        )
        return sections
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to auto-generate sections: {str(e)}"
        )


@router.post("/{report_id}/finalize", status_code=status.HTTP_200_OK)
async def finalize_report(
    report_id: UUID,
    finalize_data: ReportFinalizeRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Finalize report (lock for editing)
    
    - **reviewed_by_id**: Optional reviewer ID
    """
    service = ReportService()
    
    success = await service.finalize_report(
        report_id=report_id,
        reviewed_by=finalize_data.reviewed_by_id,
        user_id=UUID(current_user["id"])
    )
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to finalize report"
        )
    
    return {"message": "Report finalized successfully"}


@router.get("/{report_id}/pdf")
async def get_report_pdf(
    report_id: UUID,
    current_user: dict = Depends(get_current_user)
):
    """
    Generate and download report as PDF
    """
    service = ReportService()
    
    pdf_path = await service.generate_pdf(
        report_id=report_id,
        user_id=UUID(current_user["id"])
    )
    
    if not pdf_path:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate PDF"
        )
    
    # TODO: Return actual file
    return {"pdf_path": pdf_path, "message": "PDF generation placeholder"}


@router.post("/pre-exam/{case_id}", response_model=Report, status_code=status.HTTP_201_CREATED)
async def generate_pre_exam_report(
    case_id: UUID,
    current_user: dict = Depends(get_current_user)
):
    """
    Generate a pre-examination report for physician review
    
    This report is created BEFORE the physical examination and includes:
    - Patient demographics
    - Injury details
    - Medical history from extracted entities
    - Timeline of medical events
    - Document summary
    - Key findings
    - Examination preparation guide
    """
    service = ReportService()
    
    try:
        report = await service.generate_pre_exam_report(
            case_id=case_id,
            created_by=UUID(current_user["id"])
        )
        return report
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate pre-exam report: {str(e)}"
        )
