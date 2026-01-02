"""
Medical Document Intelligence Service
Unified Gemini 2.0 Series pipeline for high-capacity medical record analysis
"""

import os
import asyncio
import json
import io
import logging
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, asdict
from datetime import datetime
from uuid import UUID

from google import genai
from google.genai import types
from PyPDF2 import PdfReader, PdfWriter
from supabase import Client
from app.core.database import get_supabase_admin

logger = logging.getLogger(__name__)


@dataclass
class BoundingBox:
    """Coordinates for detected elements"""
    x: float
    y: float
    width: float
    height: float


@dataclass
class TableCell:
    """Detected table cell"""
    text: str
    row: int
    column: int
    confidence: float
    bounding_box: Optional[BoundingBox] = None


@dataclass
class Table:
    """Detected table structure"""
    cells: List[TableCell]
    row_count: int
    column_count: int
    confidence: float
    page_number: int


@dataclass
class DocumentSection:
    """Detected document section"""
    title: str
    content: str
    section_type: str  # e.g., "history", "examination", "diagnosis", "plan"
    page_number: int
    confidence: float
    bounding_box: Optional[BoundingBox] = None


@dataclass
class MedicalEntity:
    """Extracted medical entity"""
    text: str
    category: str  # diagnosis, medication, procedure, symptom, etc.
    icd10_code: Optional[str] = None
    confidence: float = 0.0
    page_number: Optional[int] = None
    source_text: Optional[str] = None  # surrounding context


@dataclass
class ClinicalDate:
    """Extracted clinical date"""
    date: str  # ISO format
    date_type: str  # injury_date, service_date, surgery_date, etc.
    confidence: float
    page_number: int
    source_text: str


@dataclass
class MedicalDocumentIntelligenceResult:
    """Complete document intelligence output"""
    document_type: str  # e.g., "progress_note", "operative_report", etc.
    ocr_text: str
    ocr_confidence: float
    sections: List[DocumentSection]
    tables: List[Table]
    medical_entities: List[MedicalEntity]
    clinical_dates: List[ClinicalDate]
    page_count: int
    processing_time: float
    quality_score: float
    inconsistencies: Optional[List[Dict[str, Any]]] = None


class MedicalDocumentIntelligence:
    """
    Advanced Medical Document Intelligence Service
    Uses Gemini 2.0 Pro & Flash for state-of-the-art multimodal extraction
    """
    
    def __init__(
        self, 
        api_key: str
    ):
        """Initialize service with Google AI Studio API Key"""
        self.client = genai.Client(api_key=api_key)
        self.flash_model = "gemini-2.0-flash"
        self.pro_model = "gemini-2.0-pro-exp-02-05"
        self.chunk_size = 50 # Pages per parallel chunk
        self.supabase: Client = get_supabase_admin()
        
    
    async def analyze_document(
        self, 
        pdf_path: str,
        case_id: UUID,
        document_id: UUID,
        document_type_hint: Optional[str] = None
    ) -> MedicalDocumentIntelligenceResult:
        """
        Analyze medical document end-to-end using Gemini 2.0
        
        Args:
            pdf_path: Path to PDF file
            case_id: Case ID context
            document_id: Document ID for persistence
            document_type_hint: Optional hint about document type
            
        Returns:
            Complete document intelligence result
        """
        start_time = datetime.now()
        logger.info(f"Starting Gemini 2.0 analysis: {pdf_path}")
        
        # 1. Segment PDF for large files
        chunks = self._segment_pdf(pdf_path)
        logger.info(f"Split document into {len(chunks)} chunks")
        
        # 2. Parallel Extraction with Flash (Multimodal)
        tasks = [self._process_chunk_with_flash(chunk, i) for i, chunk in enumerate(chunks)]
        chunk_results = await asyncio.gather(*tasks)
        
        # 3. Holistic Synthesis with Pro
        final_data = await self._synthesize_results_with_pro(
            chunk_results, 
            document_type_hint
        )
        
        processing_time = (datetime.now() - start_time).total_seconds()
        
        # Build Result Object
        result = MedicalDocumentIntelligenceResult(
            document_type=final_data.get("document_type", "Comprehensive Medical Record"),
            ocr_text="Content extracted via multimodal analysis (refer to sections)",
            ocr_confidence=final_data.get("quality_score", 0.9),
            sections=[DocumentSection(**s) for s in final_data.get("sections", [])],
            tables=[Table(**t) for t in final_data.get("tables", [])],
            medical_entities=[MedicalEntity(**e) for e in final_data.get("medical_entities", [])],
            clinical_dates=[ClinicalDate(**d) for d in final_data.get("clinical_dates", [])],
            page_count=len(chunks) * self.chunk_size, # Estimates
            processing_time=processing_time,
            quality_score=final_data.get("quality_score", 0.9),
            inconsistencies=final_data.get("inconsistencies", [])
        )
        
        # 4. Auto-Persist findings
        await self._persist_results(case_id, document_id, result)
            
        logger.info(f"Analysis complete in {processing_time:.2f}s")
        return result


    def _segment_pdf(self, pdf_path: str) -> List[bytes]:
        """Splits PDF into binary chunks of 50 pages each"""
        reader = PdfReader(pdf_path)
        total_pages = len(reader.pages)
        chunks = []
        
        for i in range(0, total_pages, self.chunk_size):
            writer = PdfWriter()
            end_page = min(i + self.chunk_size, total_pages)
            for page_num in range(i, end_page):
                writer.add_page(reader.pages[page_num])
            
            chunk_buffer = io.BytesIO()
            writer.write(chunk_buffer)
            chunks.append(chunk_buffer.getvalue())
        return chunks


    async def _process_chunk_with_flash(self, chunk_data: bytes, index: int) -> Dict[str, Any]:
        """Native multimodal extraction for a chunk using Gemini 2.0 Flash"""
        prompt = """
        ACT AS: Medical Records Specialist.
        TASK: Analyze this medicine chart segment.
        EXTRACT as structured JSON:
        1. All medical entities (diagnoses+ICD10, medications+dose, procedures).
        2. Clinical dates (service, injury, surgery).
        3. Detailed document sections (titles and summary content).
        4. Any tables found (as structured rows/columns).
        
        Return valid JSON only.
        """
        
        response = await asyncio.to_thread(
            self.client.models.generate_content,
            model=self.flash_model,
            contents=[
                types.Part.from_bytes(data=chunk_data, mime_type='application/pdf'),
                prompt
            ],
            config=types.GenerateContentConfig(response_mime_type='application/json')
        )
        
        try:
            return json.loads(response.text)
        except Exception:
            return {"error": "extraction failed", "chunk": index}


    async def _synthesize_results_with_pro(
        self, 
        chunk_results: List[Dict[str, Any]],
        hint: Optional[str]
    ) -> Dict[str, Any]:
        """Synthesizes parallel results into a master MediCase schema using Gemini 2.0 Pro"""
        context = json.dumps(chunk_results)
        prompt = f"""
        ACT AS: Senior Medicolegal Quality Auditor.
        INPUT DATA: Extracted findings from parallel segments of a large medical record.
        {context}
        
        TASK:
        1. Merge segments into a single consistent medical report summary.
        2. Identify and explicitly list any clinical inconsistencies or contradictory statements.
        3. Format everything for the MediCase API schema (sections, entities, dates, tables).
        
        Return ONLY valid JSON.
        """
        
        response = await asyncio.to_thread(
            self.client.models.generate_content,
            model=self.pro_model,
            contents=prompt,
            config=types.GenerateContentConfig(response_mime_type='application/json')
        )
        return json.loads(response.text)


    async def _persist_results(self, case_id: UUID, document_id: UUID, result: MedicalDocumentIntelligenceResult):
        """Writes findings to specialized medical intelligence tables"""
        logger.info(f"Persisting findings for Case {case_id}, Document {document_id}")
        
        # 1. Update Document Metadata (Classification & Quality)
        # Dynamic Schema Mapping for Documents table
        doc_update = {"ocr_status": "completed"}
        
        # Try to include advanced metadata if columns exist
        try:
            doc_update.update({
                "document_type": result.document_type,
                "quality_score": result.quality_score,
                "intelligence_result": asdict(result)
            })
            self.supabase.table("documents").update(doc_update).eq("id", str(document_id)).execute()
        except Exception as e:
            logger.warning(f"Metadata persistence restricted: {e}. Falling back to basic status.")
            self.supabase.table("documents").update({"ocr_status": "completed"}).eq("id", str(document_id)).execute()

        # 2. Persist Medical Entities
        if result.medical_entities:
            entities_data = [
                {
                    "document_id": str(document_id),
                    "entity_text": e.text,
                    "category": e.category,
                    "icd10_code": e.icd10_code,
                    "confidence": e.confidence,
                    "source_text": e.source_text
                }
                for e in result.medical_entities
            ]
            self.supabase.table("medical_entities").insert(entities_data).execute()
        
        # 3. Persist Clinical Dates
        if result.clinical_dates:
            dates_data = [
                {
                    "document_id": str(document_id),
                    "date_value": d.date[:10],
                    "date_type": d.date_type,
                    "confidence": d.confidence,
                    "source_text": d.source_text
                }
                for d in result.clinical_dates
            ]
            self.supabase.table("clinical_dates").insert(dates_data).execute()
