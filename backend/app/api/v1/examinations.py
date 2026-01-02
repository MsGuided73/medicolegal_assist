"""
Examinations API Router
RESTful endpoints for physical examinations
"""

from fastapi import APIRouter, Depends, HTTPException, status
from uuid import UUID

from app.models.examination import (
    Examination, ExaminationCreate, ExaminationDetail,
    ROMMeasurement, ROMMeasurementCreate,
    StrengthTest, StrengthTestCreate,
    SpecialTest, SpecialTestCreate
)
from app.services.examination_service import ExaminationService
from app.api.dependencies import get_current_user

router = APIRouter(prefix="/examinations", tags=["examinations"])


@router.post("", response_model=Examination, status_code=status.HTTP_201_CREATED)
async def create_examination(
    exam_data: ExaminationCreate,
    current_user: dict = Depends(get_current_user)
):
    """
    Create a new physical examination session
    
    - **case_id**: ID of the case
    - **exam_date**: Date of examination
    - **exam_location**: Where exam took place
    - **patient_demeanor**: Patient's presentation
    - **reliability**: Patient reliability assessment
    """
    service = ExaminationService()
    
    try:
        exam = await service.create_examination(
            exam_data=exam_data,
            created_by=UUID(current_user["id"])
        )
        return exam
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create examination: {str(e)}"
        )


@router.get("/{examination_id}", response_model=ExaminationDetail)
async def get_examination(
    examination_id: UUID,
    current_user: dict = Depends(get_current_user)
):
    """
    Get examination with all measurements
    
    Returns:
    - Examination details
    - All ROM measurements
    - All strength tests
    - All special tests
    """
    service = ExaminationService()
    
    exam = await service.get_examination(
        examination_id=examination_id,
        user_id=UUID(current_user["id"])
    )
    
    if not exam:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Examination {examination_id} not found"
        )
    
    return exam


@router.post("/{examination_id}/rom", response_model=ROMMeasurement)
async def add_rom_measurement(
    examination_id: UUID,
    rom_data: ROMMeasurementCreate,
    current_user: dict = Depends(get_current_user)
):
    """
    Add Range of Motion measurement to examination
    
    - **body_region**: Region being tested (e.g., "shoulder", "knee")
    - **joint**: Specific joint
    - **movement**: Type of movement (e.g., "flexion", "extension")
    - **side**: left, right, or bilateral
    - **active_rom**: Active ROM in degrees
    - **passive_rom**: Passive ROM in degrees
    - **normal_rom**: Normal expected ROM
    - **pain_on_movement**: Whether patient experienced pain
    - **pain_level**: 0-10 scale
    """
    service = ExaminationService()
    
    # Ensure examination_id matches
    rom_data.examination_id = examination_id
    
    try:
        rom = await service.add_rom_measurement(
            rom_data=rom_data,
            user_id=UUID(current_user["id"])
        )
        return rom
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to add ROM measurement: {str(e)}"
        )


@router.post("/{examination_id}/strength", response_model=StrengthTest)
async def add_strength_test(
    examination_id: UUID,
    strength_data: StrengthTestCreate,
    current_user: dict = Depends(get_current_user)
):
    """
    Add strength test to examination
    
    - **body_region**: Region being tested
    - **muscle_group**: Specific muscle group
    - **side**: left, right, or bilateral
    - **strength_grade**: 0-5 scale (0=no contraction, 5=normal)
    - **pain_on_testing**: Whether patient experienced pain
    """
    service = ExaminationService()
    
    strength_data.examination_id = examination_id
    
    try:
        strength = await service.add_strength_test(
            strength_data=strength_data,
            user_id=UUID(current_user["id"])
        )
        return strength
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to add strength test: {str(e)}"
        )


@router.post("/{examination_id}/special-test", response_model=SpecialTest)
async def add_special_test(
    examination_id: UUID,
    test_data: SpecialTestCreate,
    current_user: dict = Depends(get_current_user)
):
    """
    Add special/provocation test to examination
    
    - **test_name**: Name of test (e.g., "Neer Test", "Hawkins-Kennedy")
    - **body_region**: Region being tested
    - **result**: positive, negative, or equivocal
    - **findings**: Detailed findings
    """
    service = ExaminationService()
    
    test_data.examination_id = examination_id
    
    try:
        test = await service.add_special_test(
            test_data=test_data,
            user_id=UUID(current_user["id"])
        )
        return test
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to add special test: {str(e)}"
        )


@router.put("/{examination_id}/complete", status_code=status.HTTP_200_OK)
async def complete_examination(
    examination_id: UUID,
    current_user: dict = Depends(get_current_user)
):
    """
    Mark examination as completed
    """
    service = ExaminationService()
    
    success = await service.complete_examination(
        examination_id=examination_id,
        user_id=UUID(current_user["id"])
    )
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to complete examination"
        )
    
    return {"message": "Examination completed successfully"}
