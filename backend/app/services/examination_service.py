"""
Examination Service
Complete business logic for physical examinations
"""

from uuid import UUID
from typing import List, Optional
from datetime import date, datetime
import logging

from supabase import Client
from app.core.database import get_supabase
from app.models.examination import (
    Examination, ExaminationCreate, ExaminationUpdate,
    ROMMeasurement, ROMMeasurementCreate,
    StrengthTest, StrengthTestCreate,
    SpecialTest, SpecialTestCreate,
    ExaminationDetail
)

logger = logging.getLogger(__name__)


class ExaminationService:
    """Service for managing physical examinations"""
    
    def __init__(self):
        self.supabase: Client = get_supabase()
    
    async def create_examination(
        self,
        exam_data: ExaminationCreate,
        created_by: UUID
    ) -> Examination:
        """Create a new examination session"""
        try:
            exam_dict = {
                "case_id": str(exam_data.case_id),
                "exam_date": exam_data.exam_date.isoformat(),
                "exam_location": exam_data.exam_location,
                "patient_demeanor": exam_data.patient_demeanor,
                "reliability": exam_data.reliability.value if exam_data.reliability else None,
                "physician_notes": exam_data.physician_notes,
                "examining_physician_id": str(created_by),
                "status": "in_progress",
                "created_by": str(created_by)
            }
            
            result = self.supabase.table("examinations").insert(exam_dict).execute()
            
            if not result.data:
                raise Exception("Failed to create examination")
            
            logger.info(f"Examination created for case {exam_data.case_id}")
            
            return Examination(**result.data[0])
            
        except Exception as e:
            logger.error(f"Failed to create examination: {str(e)}")
            raise
    
    async def get_examination(
        self,
        examination_id: UUID,
        user_id: UUID
    ) -> Optional[ExaminationDetail]:
        """Get examination with all measurements"""
        try:
            # Get examination
            exam_result = self.supabase.table("examinations")\
                .select("*")\
                .eq("id", str(examination_id))\
                .single()\
                .execute()
            
            if not exam_result.data:
                return None
            
            exam = Examination(**exam_result.data)
            
            # Get ROM measurements
            rom_result = self.supabase.table("rom_measurements")\
                .select("*")\
                .eq("examination_id", str(examination_id))\
                .execute()
            
            rom_measurements = [ROMMeasurement(**r) for r in rom_result.data]
            
            # Get strength tests
            strength_result = self.supabase.table("strength_tests")\
                .select("*")\
                .eq("examination_id", str(examination_id))\
                .execute()
            
            strength_tests = [StrengthTest(**s) for s in strength_result.data]
            
            # Get special tests
            special_result = self.supabase.table("special_tests")\
                .select("*")\
                .eq("examination_id", str(examination_id))\
                .execute()
            
            special_tests = [SpecialTest(**s) for s in special_result.data]
            
            # Combine into ExaminationDetail
            detail = ExaminationDetail(
                **exam.dict(),
                rom_measurements=rom_measurements,
                strength_tests=strength_tests,
                special_tests=special_tests
            )
            
            return detail
            
        except Exception as e:
            logger.error(f"Failed to get examination: {str(e)}")
            return None
    
    async def add_rom_measurement(
        self,
        rom_data: ROMMeasurementCreate,
        user_id: UUID
    ) -> ROMMeasurement:
        """Add ROM measurement to examination"""
        try:
            rom_dict = {
                "examination_id": str(rom_data.examination_id),
                "body_region": rom_data.body_region,
                "joint": rom_data.joint,
                "movement": rom_data.movement,
                "side": rom_data.side.value if rom_data.side else None,
                "active_rom": rom_data.active_rom,
                "passive_rom": rom_data.passive_rom,
                "normal_rom": rom_data.normal_rom,
                "pain_on_movement": rom_data.pain_on_movement,
                "pain_level": rom_data.pain_level,
                "end_feel": rom_data.end_feel,
                "notes": rom_data.notes
            }
            
            result = self.supabase.table("rom_measurements").insert(rom_dict).execute()
            
            if not result.data:
                raise Exception("Failed to add ROM measurement")
            
            logger.info(f"ROM measurement added to examination {rom_data.examination_id}")
            
            return ROMMeasurement(**result.data[0])
            
        except Exception as e:
            logger.error(f"Failed to add ROM measurement: {str(e)}")
            raise
    
    async def add_strength_test(
        self,
        strength_data: StrengthTestCreate,
        user_id: UUID
    ) -> StrengthTest:
        """Add strength test to examination"""
        try:
            strength_dict = {
                "examination_id": str(strength_data.examination_id),
                "body_region": strength_data.body_region,
                "muscle_group": strength_data.muscle_group,
                "side": strength_data.side.value if strength_data.side else None,
                "strength_grade": strength_data.strength_grade,
                "strength_description": strength_data.strength_description,
                "pain_on_testing": strength_data.pain_on_testing,
                "pain_level": strength_data.pain_level,
                "notes": strength_data.notes
            }
            
            result = self.supabase.table("strength_tests").insert(strength_dict).execute()
            
            if not result.data:
                raise Exception("Failed to add strength test")
            
            logger.info(f"Strength test added to examination {strength_data.examination_id}")
            
            return StrengthTest(**result.data[0])
            
        except Exception as e:
            logger.error(f"Failed to add strength test: {str(e)}")
            raise
    
    async def add_special_test(
        self,
        test_data: SpecialTestCreate,
        user_id: UUID
    ) -> SpecialTest:
        """Add special test to examination"""
        try:
            test_dict = {
                "examination_id": str(test_data.examination_id),
                "test_name": test_data.test_name,
                "body_region": test_data.body_region,
                "side": test_data.side.value if test_data.side else None,
                "result": test_data.result.value if test_data.result else None,
                "findings": test_data.findings,
                "notes": test_data.notes
            }
            
            result = self.supabase.table("special_tests").insert(test_dict).execute()
            
            if not result.data:
                raise Exception("Failed to add special test")
            
            logger.info(f"Special test added to examination {test_data.examination_id}")
            
            return SpecialTest(**result.data[0])
            
        except Exception as e:
            logger.error(f"Failed to add special test: {str(e)}")
            raise
    
    async def complete_examination(
        self,
        examination_id: UUID,
        user_id: UUID
    ) -> bool:
        """Mark examination as completed"""
        try:
            self.supabase.table("examinations")\
                .update({"status": "completed"})\
                .eq("id", str(examination_id))\
                .execute()
            
            logger.info(f"Examination {examination_id} marked as completed")
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to complete examination: {str(e)}")
            return False
