"""
Case Management Service
Complete business logic for IME case management
"""

from uuid import UUID
from typing import List, Optional, Dict
from datetime import date, datetime
import logging

from supabase import Client
from app.core.database import get_supabase
from app.models.case import (
    Case, CaseCreate, CaseUpdate, CaseStatus, 
    CaseAssignment, CaseStatusChange
)

logger = logging.getLogger(__name__)


class CaseService:
    """Service for managing IME cases"""
    
    def __init__(self):
        self.supabase: Client = get_supabase()
    
    async def create_case(
        self,
        case_data: CaseCreate,
        created_by_id: UUID
    ) -> Case:
        """
        Create a new IME case
        """
        try:
            # Generate unique case number
            case_number = await self._generate_case_number()
            
            # Legacy Schema Compatibility: Some columns might not exist in target Supabase environment
            # Mapping from model to actual DB columns found via introspection
            case_dict = {
                "case_number": case_number,
                "patient_name": f"{case_data.patient_first_name} {case_data.patient_last_name}".strip(),
                "injury_date": case_data.injury_date.isoformat() if case_data.injury_date else None,
                "status": CaseStatus.OPEN.value,
                "assigned_physician_id": str(created_by_id) # Direct assignment for compatibility
            }
            
            # Insert case into database
            result = self.supabase.table("cases").insert(case_dict).execute()
            
            if not result.data:
                raise Exception("Failed to create case - no data returned")
            
            case = result.data[0]
            case_id = UUID(case["id"])
            
            # Auto-assign to creator if they're a physician
            user = await self._get_profile(created_by_id)
            if user and user.get("role") == "physician":
                await self.assign_case(
                    case_id=case_id,
                    user_id=created_by_id,
                    role="physician",
                    assigned_by=created_by_id
                )
                case["assigned_physician_id"] = str(created_by_id)
            
            # Log initial status
            await self._log_status_change(
                case_id=case_id,
                from_status=None,
                to_status=CaseStatus.OPEN.value,
                changed_by=created_by_id,
                notes="Case created"
            )
            
            # Create audit log
            await self._create_audit_log(
                user_id=created_by_id,
                action="case_created",
                resource_type="case",
                resource_id=case_id,
                details={"case_number": case_number}
            )
            
            logger.info(f"Case created: {case_number} by user {created_by_id}")
            
            return Case(**case)
            
        except Exception as e:
            logger.error(f"Failed to create case: {str(e)}")
            raise
    
    async def get_case(
        self,
        case_id: UUID,
        user_id: UUID
    ) -> Optional[Case]:
        """
        Get a single case by ID
        
        Args:
            case_id: Case ID
            user_id: ID of user requesting (for RLS)
            
        Returns:
            Case if found and accessible, None otherwise
        """
        try:
            result = self.supabase.table("cases")\
                .select("*")\
                .eq("id", str(case_id))\
                .single()\
                .execute()
            
            if not result.data:
                logger.warning(f"Case {case_id} not found or not accessible to user {user_id}")
                return None
            
            return Case(**result.data)
            
        except Exception as e:
            logger.error(f"Failed to get case {case_id}: {str(e)}")
            return None
    
    async def list_cases(
        self,
        user_id: UUID,
        status: Optional[str] = None,
        assigned_to: Optional[UUID] = None,
        priority: Optional[str] = None,
        limit: int = 50,
        offset: int = 0
    ) -> List[Case]:
        """
        List cases with optional filters
        """
        try:
            query = self.supabase.table("cases").select("*")
            
            # Apply filters
            if status:
                query = query.eq("status", status)
            
            if assigned_to:
                query = query.eq("assigned_physician_id", str(assigned_to))
            
            if priority:
                query = query.eq("priority", priority)
            
            # Order and paginate
            query = query.order("created_at", desc=True)
            query = query.range(offset, offset + limit - 1)
            
            result = query.execute()
            
            cases = []
            for case_data in result.data:
                # Compatibility check: if patient_name exists but names don't, map them
                if 'patient_name' in case_data:
                    # Best effort split (reverse-compatibility)
                    full_name = case_data['patient_name'] or ""
                    parts = full_name.split(" ", 1)
                    if 'patient_first_name' not in case_data or not case_data['patient_first_name']:
                        case_data['patient_first_name'] = parts[0] if len(parts) > 0 else "Unknown"
                    if 'patient_last_name' not in case_data or not case_data['patient_last_name']:
                        case_data['patient_last_name'] = parts[1] if len(parts) > 1 else "Patient"
                
                # Mock created_by if missing to pass validation
                if 'created_by' not in case_data or not case_data['created_by']:
                    case_data['created_by'] = str(user_id)

                cases.append(Case(**case_data))
            
            logger.info(f"Listed {len(cases)} cases for user {user_id}")
            
            return cases
            
        except Exception as e:
            logger.error(f"Failed to list cases: {str(e)}")
            return []
    
    async def update_case(
        self,
        case_id: UUID,
        case_data: CaseUpdate,
        updated_by: UUID
    ) -> Optional[Case]:
        """
        Update case details
        
        Args:
            case_id: Case ID
            case_data: Updated case data
            updated_by: ID of user updating
            
        Returns:
            Updated case if successful, None otherwise
        """
        try:
            # Prepare update dictionary (only non-None values)
            update_data = case_data.dict(exclude_unset=True)
            update_dict = {}
            
            for field, value in update_data.items():
                if value is not None:
                    if isinstance(value, (date, datetime)):
                        update_dict[field] = value.isoformat()
                    elif isinstance(value, list):
                        update_dict[field] = value
                    elif hasattr(value, 'value'):  # Enum
                        update_dict[field] = value.value
                    else:
                        update_dict[field] = value
            
            if not update_dict:
                logger.warning(f"No updates provided for case {case_id}")
                return await self.get_case(case_id, updated_by)
            
            update_dict["updated_at"] = datetime.utcnow().isoformat()
            
            # Update case
            result = self.supabase.table("cases")\
                .update(update_dict)\
                .eq("id", str(case_id))\
                .execute()
            
            if not result.data:
                logger.error(f"Failed to update case {case_id} - no data returned")
                return None
            
            # Create audit log
            await self._create_audit_log(
                user_id=updated_by,
                action="case_updated",
                resource_type="case",
                resource_id=case_id,
                details=update_dict
            )
            
            logger.info(f"Case {case_id} updated by user {updated_by}")
            
            return Case(**result.data[0])
            
        except Exception as e:
            logger.error(f"Failed to update case {case_id}: {str(e)}")
            return None
    
    async def assign_case(
        self,
        case_id: UUID,
        user_id: UUID,
        role: str,
        assigned_by: UUID
    ) -> bool:
        """
        Assign case to a user
        
        Args:
            case_id: Case ID
            user_id: ID of user to assign to
            role: Role (physician or medical_assistant)
            assigned_by: ID of user making assignment
            
        Returns:
            True if successful, False otherwise
        """
        try:
            # Validate role
            if role not in ["physician", "medical_assistant"]:
                raise ValueError(f"Invalid role: {role}")
            
            # Determine field to update
            field_map = {
                "physician": "assigned_physician_id",
                "medical_assistant": "assigned_assistant_id"
            }
            
            field = field_map[role]
            
            # Update case with assignment
            update_dict = {
                field: str(user_id),
                "updated_at": datetime.utcnow().isoformat()
            }
            
            self.supabase.table("cases")\
                .update(update_dict)\
                .eq("id", str(case_id))\
                .execute()
            
            # Log assignment in case_assignments table
            assignment_data = {
                "case_id": str(case_id),
                "assigned_to": str(user_id),
                "role": role,
                "assigned_by": str(assigned_by),
                "assigned_at": datetime.utcnow().isoformat()
            }
            
            self.supabase.table("case_assignments").insert(assignment_data).execute()
            
            # Create audit log
            await self._create_audit_log(
                user_id=assigned_by,
                action="case_assigned",
                resource_type="case",
                resource_id=case_id,
                details={"assigned_to": str(user_id), "role": role}
            )
            
            logger.info(f"Case {case_id} assigned to user {user_id} as {role}")
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to assign case {case_id}: {str(e)}")
            return False
    
    async def change_status(
        self,
        case_id: UUID,
        status_change: CaseStatusChange,
        changed_by: UUID
    ) -> bool:
        """
        Change case status
        
        Args:
            case_id: Case ID
            status_change: New status and optional notes
            changed_by: ID of user changing status
            
        Returns:
            True if successful, False otherwise
        """
        try:
            # Get current case
            current_case = await self.get_case(case_id, changed_by)
            if not current_case:
                logger.error(f"Case {case_id} not found")
                return False
            
            old_status = current_case.status
            new_status = status_change.new_status.value
            
            # Validate status transition
            if not self._is_valid_transition(old_status, new_status):
                raise ValueError(f"Invalid status transition: {old_status} -> {new_status}")
            
            # Update status
            self.supabase.table("cases")\
                .update({
                    "status": new_status,
                    "updated_at": datetime.utcnow().isoformat()
                })\
                .eq("id", str(case_id))\
                .execute()
            
            # Log status change
            await self._log_status_change(
                case_id=case_id,
                from_status=old_status,
                to_status=new_status,
                changed_by=changed_by,
                notes=status_change.notes
            )
            
            # Create audit log
            await self._create_audit_log(
                user_id=changed_by,
                action="case_status_changed",
                resource_type="case",
                resource_id=case_id,
                details={
                    "from_status": old_status,
                    "to_status": new_status,
                    "notes": status_change.notes
                }
            )
            
            logger.info(f"Case {case_id} status changed: {old_status} -> {new_status}")
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to change case status: {str(e)}")
            return False
    
    async def search_cases(
        self,
        user_id: UUID,
        query: str,
        limit: int = 50
    ) -> List[Case]:
        """
        Search cases by patient name or case number
        
        Args:
            user_id: ID of user searching (for RLS)
            query: Search query
            limit: Maximum results
            
        Returns:
            List of matching cases
        """
        try:
            # Search in case number, patient name
            result = self.supabase.table("cases")\
                .select("*")\
                .or_(
                    f"case_number.ilike.%{query}%,"
                    f"patient_first_name.ilike.%{query}%,"
                    f"patient_last_name.ilike.%{query}%"
                )\
                .order("created_at", desc=True)\
                .limit(limit)\
                .execute()
            
            cases = [Case(**case) for case in result.data]
            
            logger.info(f"Search '{query}' returned {len(cases)} results")
            
            return cases
            
        except Exception as e:
            logger.error(f"Failed to search cases: {str(e)}")
            return []
    
    async def get_case_stats(self, user_id: UUID) -> Dict:
        """
        Get case statistics for dashboard
        
        Args:
            user_id: ID of user requesting stats
            
        Returns:
            Dictionary with statistics
        """
        try:
            # Get all accessible cases for user
            all_cases = await self.list_cases(user_id, limit=1000)
            
            stats = {
                "total": len(all_cases),
                "by_status": {},
                "by_priority": {},
                "upcoming_exams": 0,
                "overdue_reports": 0
            }
            
            # Count by status
            for case in all_cases:
                status = case.status
                stats["by_status"][status] = stats["by_status"].get(status, 0) + 1
                
                priority = case.priority or "normal"
                stats["by_priority"][priority] = stats["by_priority"].get(priority, 0) + 1
            
            # Count upcoming exams (next 7 days)
            today = date.today()
            for case in all_cases:
                if case.exam_date and case.exam_date >= today:
                    days_until = (case.exam_date - today).days
                    if days_until <= 7:
                        stats["upcoming_exams"] += 1
            
            # Count overdue reports
            for case in all_cases:
                if case.report_due_date and case.report_due_date < today:
                    if case.status not in ["completed", "archived"]:
                        stats["overdue_reports"] += 1
            
            logger.info(f"Generated stats for user {user_id}: {stats['total']} total cases")
            
            return stats
            
        except Exception as e:
            logger.error(f"Failed to get case stats: {str(e)}")
            return {
                "total": 0,
                "by_status": {},
                "by_priority": {},
                "upcoming_exams": 0,
                "overdue_reports": 0
            }
    
    async def delete_case(
        self,
        case_id: UUID,
        deleted_by: UUID
    ) -> bool:
        """
        Soft delete a case (archive it)
        
        Args:
            case_id: Case ID
            deleted_by: ID of user deleting
            
        Returns:
            True if successful
        """
        try:
            # Change status to archived instead of hard delete
            status_change = CaseStatusChange(
                new_status=CaseStatus.ARCHIVED,
                notes="Case archived (deleted)"
            )
            
            success = await self.change_status(case_id, status_change, deleted_by)
            
            if success:
                logger.info(f"Case {case_id} archived by user {deleted_by}")
            
            return success
            
        except Exception as e:
            logger.error(f"Failed to delete case {case_id}: {str(e)}")
            return False
    
    # ========================================================================
    # HELPER METHODS
    # ========================================================================
    
    async def _generate_case_number(self) -> str:
        """
        Generate unique case number
        Format: YYYY-NNNN (year + sequential number)
        
        Returns:
            Case number string
        """
        year = datetime.now().year
        
        # Get count of cases this year
        result = self.supabase.table("cases")\
            .select("case_number")\
            .like("case_number", f"{year}-%")\
            .execute()
        
        count = len(result.data) + 1
        
        return f"{year}-{count:04d}"
    
    def _is_valid_transition(self, from_status: str, to_status: str) -> bool:
        """
        Validate status transition
        
        Args:
            from_status: Current status
            to_status: New status
            
        Returns:
            True if transition is valid
        """
        valid_transitions = {
            "open": ["in_progress", "archived"],
            "in_progress": ["review", "open", "archived"],
            "review": ["in_progress", "completed"],
            "completed": ["archived"],
            "archived": []  # Cannot transition from archived
        }
        
        allowed = valid_transitions.get(from_status, [])
        return to_status in allowed
    
    async def _log_status_change(
        self,
        case_id: UUID,
        from_status: Optional[str],
        to_status: str,
        changed_by: UUID,
        notes: Optional[str] = None
    ):
        """
        Log case status change in history table
        
        Args:
            case_id: Case ID
            from_status: Previous status (None for new case)
            to_status: New status
            changed_by: User making change
            notes: Optional notes
        """
        log_data = {
            "case_id": str(case_id),
            "from_status": from_status,
            "to_status": to_status,
            "changed_by": str(changed_by),
            "changed_at": datetime.utcnow().isoformat(),
            "notes": notes
        }
        
        self.supabase.table("case_status_history").insert(log_data).execute()
    
    async def _create_audit_log(
        self,
        user_id: UUID,
        action: str,
        resource_type: str,
        resource_id: UUID,
        details: Dict
    ):
        """
        Create audit log entry
        
        Args:
            user_id: User performing action
            action: Action type
            resource_type: Type of resource
            resource_id: Resource ID
            details: Additional details
        """
        log_data = {
            "user_id": str(user_id),
            "action": action,
            "resource_type": resource_type,
            "resource_id": str(resource_id),
            "details": details,
            "created_at": datetime.utcnow().isoformat()
        }
        
        self.supabase.table("audit_logs").insert(log_data).execute()
    
    async def _get_profile(self, user_id: UUID) -> Optional[Dict]:
        """
        Get user profile details
        
        Args:
            user_id: User ID
            
        Returns:
            Profile data if found
        """
        try:
            result = self.supabase.table("profiles")\
                .select("*")\
                .eq("id", str(user_id))\
                .single()\
                .execute()
            
            return result.data if result.data else None
            
        except Exception:
            return None
