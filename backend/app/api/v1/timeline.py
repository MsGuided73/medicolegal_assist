"""
Timeline API Router
RESTful endpoints for medical timeline
"""

from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from uuid import UUID

from app.models.timeline import TimelineEvent, TimelineEventCreate
from app.services.timeline_service import TimelineService
from app.api.dependencies import get_current_user

router = APIRouter(prefix="/timeline", tags=["timeline"])


@router.get("/cases/{case_id}", response_model=List[TimelineEvent])
async def get_case_timeline(
    case_id: UUID,
    current_user: dict = Depends(get_current_user)
):
    """
    Get complete medical timeline for a case
    
    Returns chronologically ordered events from:
    - Clinical dates extracted from documents
    - Examination dates
    - Manually added events
    """
    service = TimelineService()
    
    try:
        events = await service.get_case_timeline(
            case_id=case_id,
            user_id=UUID(current_user["id"])
        )
        return events
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get timeline: {str(e)}"
        )


@router.post("/cases/{case_id}/generate", response_model=List[TimelineEvent])
async def generate_timeline(
    case_id: UUID,
    current_user: dict = Depends(get_current_user)
):
    """
    Auto-generate timeline from case data
    
    Analyzes:
    - All documents and extracted clinical dates
    - All examinations
    - Creates timeline events automatically
    """
    service = TimelineService()
    
    try:
        events = await service.generate_timeline(
            case_id=case_id,
            user_id=UUID(current_user["id"])
        )
        return events
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate timeline: {str(e)}"
        )


@router.post("/events", response_model=TimelineEvent, status_code=status.HTTP_201_CREATED)
async def add_timeline_event(
    event_data: TimelineEventCreate,
    current_user: dict = Depends(get_current_user)
):
    """
    Manually add event to timeline
    
    - **case_id**: ID of the case
    - **event_date**: Date of event
    - **event_type**: Type of event
    - **title**: Event title
    - **description**: Event description
    - **is_milestone**: Mark as milestone
    """
    service = TimelineService()
    
    try:
        event = await service.add_timeline_event(
            event_data=event_data,
            user_id=UUID(current_user["id"])
        )
        
        if not event:
            raise Exception("Failed to create event")
        
        return event
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to add timeline event: {str(e)}"
        )
