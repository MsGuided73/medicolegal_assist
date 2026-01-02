"""
Report Service
Complete business logic for IME report generation
"""

from uuid import UUID
from typing import List, Optional, Dict, Any
from datetime import date, datetime
import logging

from supabase import Client
from app.core.database import get_supabase
from app.models.report import (
    Report, ReportCreate, ReportUpdate, ReportType,
    ReportSection, ReportSectionCreate,
    ReportDetail
)

logger = logging.getLogger(__name__)


class ReportService:
    """Service for managing IME reports"""
    
    def __init__(self):
        self.supabase: Client = get_supabase()
    
    async def create_report(
        self,
        report_data: ReportCreate,
        created_by: UUID
    ) -> Report:
        """Create a new IME report"""
        try:
            report_dict = {
                "case_id": str(report_data.case_id),
                "report_type": report_data.report_type.value,
                "report_date": report_data.report_date.isoformat() if report_data.report_date else date.today().isoformat(),
                "status": "draft",
                "primary_author_id": str(created_by),
                "content": {},
                "created_by": str(created_by)
            }
            
            result = self.supabase.table("reports").insert(report_dict).execute()
            
            if not result.data:
                raise Exception("Failed to create report")
            
            report = Report(**result.data[0])
            
            # Auto-generate default sections if template provided
            if report_data.template_id:
                await self._apply_template(report.id, report_data.template_id)
            
            logger.info(f"Report created for case {report_data.case_id}")
            
            return report
            
        except Exception as e:
            logger.error(f"Failed to create report: {str(e)}")
            raise
    
    async def get_report(
        self,
        report_id: UUID,
        user_id: UUID
    ) -> Optional[ReportDetail]:
        """Get report with all sections"""
        try:
            # Get report
            report_result = self.supabase.table("reports")\
                .select("*")\
                .eq("id", str(report_id))\
                .single()\
                .execute()
            
            if not report_result.data:
                return None
            
            report = Report(**report_result.data)
            
            # Get sections
            sections_result = self.supabase.table("report_sections")\
                .select("*")\
                .eq("report_id", str(report_id))\
                .order("section_order")\
                .execute()
            
            sections = [ReportSection(**s) for s in sections_result.data]
            
            # Combine
            detail = ReportDetail(
                **report.dict(),
                sections=sections
            )
            
            return detail
            
        except Exception as e:
            logger.error(f"Failed to get report: {str(e)}")
            return None
    
    async def add_section(
        self,
        section_data: ReportSectionCreate,
        user_id: UUID
    ) -> ReportSection:
        """Add section to report"""
        try:
            section_dict = {
                "report_id": str(section_data.report_id),
                "section_type": section_data.section_type,
                "section_title": section_data.section_title,
                "section_order": section_data.section_order,
                "content": section_data.content,
                "is_auto_generated": section_data.is_auto_generated,
                "source_data": section_data.source_data
            }
            
            result = self.supabase.table("report_sections").insert(section_dict).execute()
            
            if not result.data:
                raise Exception("Failed to add section")
            
            return ReportSection(**result.data[0])
            
        except Exception as e:
            logger.error(f"Failed to add report section: {str(e)}")
            raise
    
    async def auto_generate_sections(
        self,
        report_id: UUID,
        case_id: UUID,
        user_id: UUID
    ) -> List[ReportSection]:
        """Auto-generate report sections from case data"""
        try:
            sections = []
            
            # Get case data
            case_result = self.supabase.table("cases")\
                .select("*")\
                .eq("id", str(case_id))\
                .single()\
                .execute()
            
            if not case_result.data:
                raise Exception("Case not found")
            
            case = case_result.data
            
            # Section 1: Patient Information
            patient_content = f"""Patient Name: {case['patient_first_name']} {case['patient_last_name']}
Date of Birth: {case.get('patient_dob', 'Not provided')}
Date of Injury: {case.get('injury_date', 'Not provided')}
Injury Mechanism: {case.get('injury_mechanism', 'Not provided')}
Body Region: {', '.join(case.get('injury_body_region', []))}"""
            
            section1 = await self.add_section(
                ReportSectionCreate(
                    report_id=report_id,
                    section_type="patient_information",
                    section_title="Patient Information",
                    section_order=1,
                    content=patient_content,
                    is_auto_generated=True,
                    source_data={"case_id": str(case_id)}
                ),
                user_id
            )
            sections.append(section1)
            
            # Get medical entities from documents
            entities_result = self.supabase.table("medical_entities")\
                .select("*")\
                .eq("document_id", str(case_id))\
                .execute()
            
            # Section 2: Medical History (from extracted entities)
            history_content = ""
            
            # Section 3: Physical Examination
            exam_result = self.supabase.table("examinations")\
                .select("*")\
                .eq("case_id", str(case_id))\
                .execute()
            
            if exam_result.data:
                exam = exam_result.data[0]
                
                # Section 3: Physical Examination
                exam_content = f"""Exam Date: {exam.get('exam_date', 'Not specified')}
Exam Location: {exam.get('exam_location', 'Not specified')}
Patient Demeanor: {exam.get('patient_demeanor', 'Not noted')}
Reliability: {exam.get('reliability', 'Not assessed')}

Physician Notes:
{exam.get('physician_notes', 'No additional notes')}"""
                
                section3 = await self.add_section(
                    ReportSectionCreate(
                        report_id=report_id,
                        section_type="physical_examination",
                        section_title="Physical Examination",
                        section_order=3,
                        content=exam_content,
                        is_auto_generated=True,
                        source_data={"examination_id": exam.get('id')}
                    ),
                    user_id
                )
                sections.append(section3)
            
            logger.info(f"Auto-generated {len(sections)} sections for report {report_id}")
            
            return sections
            
        except Exception as e:
            logger.error(f"Failed to auto-generate sections: {str(e)}")
            return []
    
    async def finalize_report(
        self,
        report_id: UUID,
        reviewed_by: Optional[UUID],
        user_id: UUID
    ) -> bool:
        """Finalize report (lock for editing)"""
        try:
            update_dict = {
                "status": "finalized",
                "finalized_date": date.today().isoformat(),
                "reviewed_by_id": str(reviewed_by) if reviewed_by else None
            }
            
            self.supabase.table("reports")\
                .update(update_dict)\
                .eq("id", str(report_id))\
                .execute()
            
            logger.info(f"Report {report_id} finalized")
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to finalize report: {str(e)}")
            return False
    
    async def generate_pdf(
        self,
        report_id: UUID,
        user_id: UUID
    ) -> Optional[str]:
        """
        Generate PDF from report
        (Placeholder - actual PDF generation would use reportlab or similar)
        """
        try:
            # TODO: Implement actual PDF generation
            # For now, return placeholder path
            pdf_path = f"/reports/{report_id}.pdf"
            
            self.supabase.table("reports")\
                .update({"pdf_path": pdf_path})\
                .eq("id", str(report_id))\
                .execute()
            
            logger.info(f"PDF generated for report {report_id}")
            
            return pdf_path
            
        except Exception as e:
            logger.error(f"Failed to generate PDF: {str(e)}")
            return None

    # ========================================================================
    # PRE-EXAMINATION REPORT METHODS
    # ========================================================================

    async def generate_pre_exam_report(
        self,
        case_id: UUID,
        created_by: UUID
    ) -> Report:
        """
        Generate a pre-examination report from available case data
        """
        try:
            # Create pre-exam report
            report_data = ReportCreate(
                case_id=case_id,
                report_type=ReportType.PRE_EXAM,
                report_date=date.today()
            )
            
            report = await self.create_report(
                report_data=report_data,
                created_by=created_by
            )
            
            # Auto-generate all sections
            await self._generate_pre_exam_sections(
                report_id=report.id,
                case_id=case_id,
                user_id=created_by
            )
            
            logger.info(f"Pre-exam report generated for case {case_id}")
            
            return report
            
        except Exception as e:
            logger.error(f"Failed to generate pre-exam report: {str(e)}")
            raise

    async def _generate_pre_exam_sections(
        self,
        report_id: UUID,
        case_id: UUID,
        user_id: UUID
    ) -> List[ReportSection]:
        """
        Generate all sections for pre-examination report
        """
        try:
            sections = []
            
            # Get case data
            case_result = self.supabase.table("cases")\
                .select("*")\
                .eq("id", str(case_id))\
                .single()\
                .execute()
            
            if not case_result.data:
                raise Exception("Case not found")
            
            case = case_result.data
            
            # 1. Case Overview
            overview_content = f"""**Case Number:** {case['case_number']}
**Status:** {case['status'].replace('_', ' ').title()}
**Priority:** {case.get('priority', 'normal').title()}
**Requesting Party:** {case.get('requesting_party', 'Not specified')}
**Report Due Date:** {case.get('report_due_date', 'Not specified')}

**Purpose of Examination:**
Independent Medical Evaluation for personal injury case.
"""
            
            sections.append(await self.add_section(
                ReportSectionCreate(
                    report_id=report_id,
                    section_type="case_overview",
                    section_title="Case Overview",
                    section_order=1,
                    content=overview_content,
                    is_auto_generated=True,
                    source_data={"case_id": str(case_id)}
                ),
                user_id
            ))
            
            # 2. Demographics
            patient_content = f"""**Name:** {case['patient_first_name']} {case['patient_last_name']}
**Date of Birth:** {case.get('patient_dob', 'Not provided')}
**Age:** {self._calculate_age(case.get('patient_dob')) if case.get('patient_dob') else 'Not calculated'}

**Scheduled Examination Date:** {case.get('exam_date', 'Not scheduled')}
"""
            sections.append(await self.add_section(
                ReportSectionCreate(
                    report_id=report_id,
                    section_type="patient_demographics",
                    section_title="Patient Demographics",
                    section_order=2,
                    content=patient_content,
                    is_auto_generated=True,
                    source_data={"case_id": str(case_id)}
                ),
                user_id
            ))

            # 3. Injury info
            injury_content = f"""**Date of Injury:** {case.get('injury_date', 'Not provided')}
**Mechanism of Injury:** {case.get('injury_mechanism', 'Not provided')}
**Body Regions Affected:** {', '.join(case.get('injury_body_region', [])) if case.get('injury_body_region') else 'Not specified'}

**Time Since Injury:** {self._calculate_time_since(case.get('injury_date')) if case.get('injury_date') else 'Not calculated'}
"""
            sections.append(await self.add_section(
                ReportSectionCreate(
                    report_id=report_id,
                    section_type="injury_information",
                    section_title="Injury Information",
                    section_order=3,
                    content=injury_content,
                    is_auto_generated=True,
                    source_data={"injury_date": case.get('injury_date')}
                ),
                user_id
            ))

            # 4. Medical History (Entities)
            entities_result = self.supabase.table("medical_entities")\
                .select("*")\
                .eq("case_id", str(case_id))\
                .execute()
            
            diagnoses = []
            medications = []
            procedures = []

            if entities_result.data:
                diagnoses = [e for e in entities_result.data if e.get('category') == 'diagnosis']
                medications = [e for e in entities_result.data if e.get('category') == 'medication']
                procedures = [e for e in entities_result.data if e.get('category') == 'procedure']
                
                history_content = "**Documented Diagnoses:**\n"
                for d in diagnoses[:15]:
                    icd = f" (ICD-10: {d.get('icd10_code')})" if d.get('icd10_code') else ""
                    history_content += f"- {d.get('entity_text', '')}{icd}\n"
                
                history_content += "\n**Current Medications:**\n"
                for m in medications[:15]:
                    history_content += f"- {m.get('entity_text', '')}\n"

                sections.append(await self.add_section(
                    ReportSectionCreate(
                        report_id=report_id,
                        section_type="medical_history",
                        section_title="Medical History (Extracted)",
                        section_order=4,
                        content=history_content,
                        is_auto_generated=True,
                        source_data={"entity_count": len(entities_result.data)}
                    ),
                    user_id
                ))

            # 5. Timeline
            dates_result = self.supabase.table("clinical_dates")\
                .select("*")\
                .eq("case_id", str(case_id))\
                .order("date_value")\
                .execute()
            
            if dates_result.data:
                timeline_content = "**Chronological Medical Timeline:**\n\n"
                for dr in dates_result.data[:20]:
                    timeline_content += f"**{dr.get('date_value')}** - {dr.get('date_type', '').replace('_', ' ').title()}\n"
                
                sections.append(await self.add_section(
                    ReportSectionCreate(
                        report_id=report_id,
                        section_type="timeline",
                        section_title="Timeline of Events",
                        section_order=5,
                        content=timeline_content,
                        is_auto_generated=True,
                        source_data={}
                    ),
                    user_id
                ))

            # 7. Key Findings (Summary)
            key_findings = "**Primary Focus Areas:**\n"
            if body_regions := case.get('injury_body_region', []):
                for br in body_regions:
                    key_findings += f"- Exam: {br.title()}\n"
            
            sections.append(await self.add_section(
                ReportSectionCreate(
                    report_id=report_id,
                    section_type="key_findings",
                    section_title="Key Examination Focus",
                    section_order=7,
                    content=key_findings,
                    is_auto_generated=True,
                    source_data={}
                ),
                user_id
            ))

            # 8. Prep Guide
            prep_content = """**Recommended Components:**
- Range of motion testing (active/passive)
- Strength testing (0-5 scale)
- Special orthopedic provocation tests
- Document objective vs subjective findings
"""
            sections.append(await self.add_section(
                ReportSectionCreate(
                    report_id=report_id,
                    section_type="examination_prep",
                    section_title="Examination Preparation Guide",
                    section_order=8,
                    content=prep_content,
                    is_auto_generated=True,
                    source_data={}
                ),
                user_id
            ))

            logger.info(f"Generated {len(sections)} pre-exam sections for report {report_id}")
            return sections
        except Exception as e:
            logger.error(f"Failed to generate pre-exam sections: {str(e)}")
            return []

    def _calculate_age(self, dob_str: str) -> str:
        try:
            dob = datetime.fromisoformat(str(dob_str))
            today = datetime.now()
            age = today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))
            return f"{age} years old"
        except: return "Unknown"

    def _calculate_time_since(self, date_str: str) -> str:
        try:
            past = datetime.fromisoformat(str(date_str))
            delta = datetime.now() - past
            years = delta.days // 365
            months = (delta.days % 365) // 30
            if years > 0: return f"{years} years, {months} months"
            return f"{months} months"
        except: return "Unknown"

    async def _apply_template(
        self,
        report_id: UUID,
        template_id: UUID
    ):
        """Apply template to report"""
        # TODO: Implement template application
        pass
