"""
Timeline Service
Generate medical timelines from documents and examinations
"""

from uuid import UUID
from typing import List, Optional
from datetime import datetime
import logging

from supabase import Client
from app.core.database import get_supabase
from app.models.timeline import (
    TimelineEvent, TimelineEventCreate,
    EventSourceType, EventSeverity
)

logger = logging.getLogger(__name__)


class TimelineService:
    """Service for managing medical timelines"""
    
    def __init__(self):
        self.supabase: Client = get_supabase()
    
    async def generate_timeline(
        self,
        case_id: UUID,
        user_id: UUID
    ) -> List[TimelineEvent]:
        """
        Auto-generate timeline from case data
        
        Args:
            case_id: Case ID
            user_id: Requesting user
            
        Returns:
            List of timeline events
        """
        try:
            events = []
            
            # Note: clinical_dates table from Phase 2
            dates_result = self.supabase.table("clinical_dates")\
                .select("*")\
                .eq("case_id", str(case_id))\
                .execute()
            
            for date_record in dates_result.data:
                event = await self.add_timeline_event(
                    TimelineEventCreate(
                        case_id=case_id,
                        event_date=date_record['date_value'],
                        event_type=date_record['date_type'],
                        title=self._format_date_title(date_record['date_type']),
                        description=date_record.get('source_text', ''),
                        source_type=EventSourceType.DOCUMENT,
                        source_id=UUID(date_record.get('document_id')) if date_record.get('document_id') else None,
                        severity=self._determine_severity(date_record['date_type']),
                        is_milestone=date_record['date_type'] in ['injury_date', 'surgery_date']
                    ),
                    user_id
                )
                if event:
                    events.append(event)
            
            # Get examination dates
            exams_result = self.supabase.table("examinations")\
                .select("*")\
                .eq("case_id", str(case_id))\
                .execute()
            
            for exam in exams_result.data:
                # Add examination event
                # Fix: convert string date if needed
                from datetime import date
                event_date = exam['exam_date']
                if isinstance(event_date, str):
                    event_date = date.fromisoformat(event_date)
                    
                event = await self.add_timeline_event(
                    TimelineEventCreate(
                        case_id=case_id,
                        event_date=event_date,
                        event_type="examination",
                        title="Physical Examination",
                        description=f"Examination at {exam.get('exam_location', 'office')}",
                        source_type=EventSourceType.EXAMINATION,
                        source_id=UUID(exam['id']),
                        is_milestone=True
                    ),
                    user_id
                )
                if event:
                    events.append(event)
            
            logger.info(f"Generated {len(events)} timeline events for case {case_id}")
            
            return events
            
        except Exception as e:
            logger.error(f"Failed to generate timeline: {str(e)}")
            return []
    
    async def add_timeline_event(
        self,
        event_data: TimelineEventCreate,
        user_id: UUID
    ) -> Optional[TimelineEvent]:
        """Add event to timeline"""
        try:
            event_dict = {
                "case_id": str(event_data.case_id),
                "event_date": event_data.event_date.isoformat() if hasattr(event_data.event_date, 'isoformat') else str(event_data.event_date),
                "event_type": event_data.event_type,
                "title": event_data.title,
                "description": event_data.description,
                "source_type": event_data.source_type.value if event_data.source_type else "manual",
                "source_id": str(event_data.source_id) if event_data.source_id else None,
                "category": event_data.category,
                "severity": event_data.severity.value if event_data.severity else "low",
                "is_milestone": event_data.is_milestone,
                "icon": self._get_icon(event_data.event_type),
                "color": self._get_color(event_data.severity)
            }
            
            result = self.supabase.table("timeline_events").insert(event_dict).execute()
            
            if not result.data:
                return None
            
            return TimelineEvent(**result.data[0])
            
        except Exception as e:
            logger.error(f"Failed to add timeline event: {str(e)}")
            return None
    
    async def get_case_timeline(
        self,
        case_id: UUID,
        user_id: UUID
    ) -> List[TimelineEvent]:
        """Get all timeline events for a case"""
        try:
            result = self.supabase.table("timeline_events")\
                .select("*")\
                .eq("case_id", str(case_id))\
                .order("event_date")\
                .execute()
            
            events = [TimelineEvent(**e) for e in result.data]
            
            return events
            
        except Exception as e:
            logger.error(f"Failed to get case timeline: {str(e)}")
            return []
    
    def _format_date_title(self, date_type: str) -> str:
        """Format title for date type"""
        titles = {
            "injury_date": "Date of Injury",
            "service_date": "Medical Service",
            "surgery_date": "Surgical Procedure",
            "symptom_onset_date": "Symptom Onset",
            "follow_up_date": "Follow-up Appointment"
        }
        return titles.get(date_type, date_type.replace("_", " ").title())
    
    def _determine_severity(self, date_type: str) -> EventSeverity:
        """Determine severity based on date type"""
        high_severity = ["injury_date", "surgery_date"]
        if date_type in high_severity:
            return EventSeverity.HIGH
        return EventSeverity.MEDIUM
    
    def _get_icon(self, event_type: str) -> str:
        """Get icon for event type"""
        icons = {
            "injury_date": "alert-circle",
            "surgery_date": "scissors",
            "examination": "stethoscope",
            "service_date": "activity",
            "default": "calendar"
        }
        return icons.get(event_type, icons["default"])
    
    def _get_color(self, severity: Optional[EventSeverity]) -> str:
        """Get color for severity"""
        if not severity:
            return "blue"
        
        colors = {
            EventSeverity.HIGH: "red",
            EventSeverity.MEDIUM: "orange",
            EventSeverity.LOW: "blue"
        }
        return colors.get(severity, "blue")
