"""
Cases API Router
RESTful endpoints for case management
"""

from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from uuid import UUID

from app.models.case import (
    Case, CaseCreate, CaseUpdate, 
    CaseAssignment, CaseStatusChange
)
from app.services.case_service import CaseService
from app.api.dependencies import get_current_user

router = APIRouter(prefix="/cases", tags=["cases"])


@router.post("", response_model=Case, status_code=status.HTTP_201_CREATED)
async def create_case(
    case_data: CaseCreate,
    current_user: dict = Depends(get_current_user)
):
    """
    Create a new IME case
    
    - **patient_first_name**: Patient's first name
    - **patient_last_name**: Patient's last name
    - **injury_date**: Date of injury
    - **exam_date**: Scheduled examination date
    - **report_due_date**: Report deadline
    """
    service = CaseService()
    
    try:
        case = await service.create_case(
            case_data=case_data,
            created_by_id=UUID(current_user["id"])
        )
        return case
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create case: {str(e)}"
        )


@router.get("", response_model=List[Case])
async def list_cases(
    status: Optional[str] = None,
    assigned_to: Optional[str] = None,
    priority: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    current_user: dict = Depends(get_current_user)
):
    """
    List all cases with optional filters
    
    - **status**: Filter by case status (open, in_progress, review, completed, archived)
    - **assigned_to**: Filter by assigned user ID
    - **priority**: Filter by priority (low, normal, high, urgent)
    - **limit**: Maximum results (default 50)
    - **offset**: Pagination offset
    """
    service = CaseService()
    
    try:
        cases = await service.list_cases(
            user_id=UUID(current_user["id"]),
            status=status,
            assigned_to=UUID(assigned_to) if assigned_to else None,
            priority=priority,
            limit=limit,
            offset=offset
        )
        return cases
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list cases: {str(e)}"
        )


@router.get("/stats", response_model=dict)
async def get_case_stats(
    current_user: dict = Depends(get_current_user)
):
    """
    Get case statistics for dashboard
    
    Returns:
    - Total cases
    - Cases by status
    - Cases by priority
    - Upcoming exams
    - Overdue reports
    """
    service = CaseService()
    
    try:
        stats = await service.get_case_stats(
            user_id=UUID(current_user["id"])
        )
        return stats
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get stats: {str(e)}"
        )


@router.get("/search", response_model=List[Case])
async def search_cases(
    q: str,
    limit: int = 50,
    current_user: dict = Depends(get_current_user)
):
    """
    Search cases by patient name or case number
    
    - **q**: Search query
    """
    service = CaseService()
    
    try:
        cases = await service.search_cases(
            user_id=UUID(current_user["id"]),
            query=q,
            limit=limit
        )
        return cases
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Search failed: {str(e)}"
        )


@router.get("/{case_id}", response_model=Case)
async def get_case(
    case_id: UUID,
    current_user: dict = Depends(get_current_user)
):
    """
    Get a specific case by ID
    """
    service = CaseService()
    
    case = await service.get_case(
        case_id=case_id,
        user_id=UUID(current_user["id"])
    )
    
    if not case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Case {case_id} not found"
        )
    
    return case


@router.put("/{case_id}", response_model=Case)
async def update_case(
    case_id: UUID,
    case_data: CaseUpdate,
    current_user: dict = Depends(get_current_user)
):
    """
    Update case details
    
    All fields are optional - only provided fields will be updated
    """
    service = CaseService()
    
    case = await service.update_case(
        case_id=case_id,
        case_data=case_data,
        updated_by=UUID(current_user["id"])
    )
    
    if not case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Case {case_id} not found"
        )
    
    return case


@router.post("/{case_id}/assign", status_code=status.HTTP_200_OK)
async def assign_case(
    case_id: UUID,
    assignment: CaseAssignment,
    current_user: dict = Depends(get_current_user)
):
    """
    Assign case to a user
    
    - **user_id**: ID of user to assign
    - **role**: Role (physician or medical_assistant)
    """
    service = CaseService()
    
    success = await service.assign_case(
        case_id=case_id,
        user_id=assignment.user_id,
        role=assignment.role,
        assigned_by=UUID(current_user["id"])
    )
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to assign case"
        )
    
    return {"message": "Case assigned successfully"}


@router.post("/{case_id}/status", status_code=status.HTTP_200_OK)
async def change_case_status(
    case_id: UUID,
    status_change: CaseStatusChange,
    current_user: dict = Depends(get_current_user)
):
    """
    Change case status
    
    Valid transitions:
    - open → in_progress, archived
    - in_progress → review, open, archived
    - review → in_progress, completed
    - completed → archived
    """
    service = CaseService()
    
    success = await service.change_status(
        case_id=case_id,
        status_change=status_change,
        changed_by=UUID(current_user["id"])
    )
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid status transition"
        )
    
    return {"message": "Status changed successfully"}


@router.delete("/{case_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_case(
    case_id: UUID,
    current_user: dict = Depends(get_current_user)
):
    """
    Delete (archive) a case
    """
    service = CaseService()
    
    success = await service.delete_case(
        case_id=case_id,
        deleted_by=UUID(current_user["id"])
    )
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Case {case_id} not found"
        )
    
    return None
