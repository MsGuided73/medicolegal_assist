"""
High-Capacity Gemini 2.0 Document Intelligence Service
Handles large medical records (649+ pages) using parallel multimodal processing
"""

import os
import asyncio
import json
from typing import List, Dict, Any, Optional
from datetime import date, datetime
from uuid import UUID
import logging
from dataclasses import dataclass, asdict

from google import genai
from google.genai import types
from PyPDF2 import PdfReader, PdfWriter
import io

from supabase import Client
from app.core.database import get_supabase_admin # Use admin for persistence

logger = logging.getLogger(__name__)

@dataclass
class GeminiAnalysisResult:
    document_type: str
    medical_entities: List[Dict[str, Any]]
    clinical_dates: List[Dict[str, Any]]
    key_findings: List[str]
    timeline_events: List[Dict[str, Any]]
    inconsistencies: List[Dict[str, Any]]
    quality_score: float

class GeminiDocumentIntelligence:
    """
    Advanced Document Intelligence using Gemini 2.0 Pro & Flash
    Built to handle 500+ page medical records via parallel chunking
    """
    
    def __init__(self, api_key: str):
        self.client = genai.Client(api_key=api_key)
        self.flash_model = "gemini-2.0-flash"
        self.pro_model = "gemini-2.0-pro-exp-02-05"
        self.chunk_size = 50 # Pages per parallel process
        self.supabase: Client = get_supabase_admin()
        
    async def analyze_large_document(self, pdf_path: str, case_id: Optional[UUID] = None) -> GeminiAnalysisResult:
        """
        Orchestrates the high-capacity pipeline:
        1. Segments PDF into 50-page chunks
        2. Parallel processing with Gemini 2.0 Flash (Multimodal)
        3. Synthesis of all chunk results with Gemini 2.0 Pro
        4. (Optional) Persist results to Supabase
        """
        logger.info(f"Starting High-Capacity analysis for: {pdf_path}")
        
        # 1. Segment PDF
        chunks = self._segment_pdf(pdf_path)
        logger.info(f"Split document into {len(chunks)} chunks of {self.chunk_size} pages each")
        
        # 2. Parallel processing with Flash (multimodal)
        tasks = [self._process_chunk_with_flash(chunk, i) for i, chunk in enumerate(chunks)]
        chunk_results = await asyncio.gather(*tasks)
        
        # 3. Holistic synthesis with Pro
        final_result = await self._synthesize_results_with_pro(chunk_results)
        
        # 4. Auto-Persist if case_id provided
        if case_id:
            await self._persist_analysis_results(case_id, final_result)
            
        return final_result

    def _segment_pdf(self, pdf_path: str) -> List[bytes]:
        """Splits a large PDF into manageable binary chunks"""
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
        """Multimodal extraction for a single chunk using Gemini 2.0 Flash"""
        logger.info(f"Processing chunk {index} with Gemini 2.0 Flash...")
        
        prompt = """
        Analyze this segment of medical records. 
        Extract the following as structured JSON:
        1. Document types identified in this segment.
        2. Medical entities (diagnoses with ICD-10, medications with dosage, procedures).
        3. Clinical dates (service dates, injury dates, surgery dates).
        4. Brief clinical findings summary for this segment.
        
        Return ONLY valid JSON.
        """
        
        response = await asyncio.to_thread(
            self.client.models.generate_content,
            model=self.flash_model,
            contents=[
                types.Part.from_bytes(data=chunk_data, mime_type='application/pdf'),
                prompt
            ],
            config=types.GenerateContentConfig(
                response_mime_type='application/json',
            )
        )
        
        try:
            return json.loads(response.text)
        except Exception as e:
            logger.error(f"Error parsing Flash result for chunk {index}: {e}")
            return {"error": str(e), "chunk_index": index}

    async def _synthesize_results_with_pro(self, chunk_results: List[Dict[str, Any]]) -> GeminiAnalysisResult:
        """Consolidates all chunk data into a master report using Gemini 2.0 Pro"""
        logger.info("Synthesizing final results with Gemini 2.0 Pro...")
        
        aggregate_context = json.dumps(chunk_results)
        
        prompt = f"""
        You are a senior medical legal consultant. Below is extracted data from parallel segments of a large medical record.
        
        DATA:
        {aggregate_context}
        
        TASK:
        1. Synthesize this data into a single master medical record summary.
        2. Create a comprehensive clinical timeline of all major events.
        3. Identify any contradictions or inconsistencies.
        4. List primary diagnoses and current medications.
        5. Assign an overall quality/legibility score (0.0 to 1.0).
        
        Return as a structured JSON object.
        """
        
        response = await asyncio.to_thread(
            self.client.models.generate_content,
            model=self.pro_model,
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type='application/json',
            )
        )
        
        data = json.loads(response.text)
        
        return GeminiAnalysisResult(
            document_type=data.get("document_type", "Comprehensive Medical Record"),
            medical_entities=data.get("medical_entities", []),
            clinical_dates=data.get("clinical_dates", []),
            key_findings=data.get("key_findings", []),
            timeline_events=data.get("timeline_events", []),
            inconsistencies=data.get("inconsistencies", []),
            quality_score=data.get("quality_score", 0.9)
        )

    async def _persist_analysis_results(self, case_id: UUID, result: GeminiAnalysisResult):
        """Writes analysis findings to medical_entities and clinical_dates tables"""
        logger.info(f"Persisting analysis findings to database for case {case_id}...")
        
        # 1. Persist Medical Entities
        if result.medical_entities:
            entity_data = [
                {
                    "case_id": str(case_id),
                    "entity_text": e.get("text", e.get("entity_text")),
                    "category": e.get("category", "finding"),
                    "icd10_code": e.get("icd10_code"),
                    "confidence": e.get("confidence", 0.9),
                    "source_text": e.get("source_text"),
                    "created_at": datetime.utcnow().isoformat()
                }
                for e in result.medical_entities
            ]
            self.supabase.table("medical_entities").insert(entity_data).execute()
        
        # 2. Persist Clinical Dates (for Timeline)
        if result.clinical_dates:
            date_data = []
            for d in result.clinical_dates:
                parsed_date = self._parse_iso_date(d.get("date", d.get("date_value")))
                if parsed_date:
                    date_data.append({
                        "case_id": str(case_id),
                        "date_value": parsed_date,
                        "date_type": d.get("date_type", "service_date"),
                        "confidence": d.get("confidence", 0.9),
                        "source_text": d.get("source_text"),
                        "created_at": datetime.utcnow().isoformat()
                    })
            
            if date_data:
                self.supabase.table("clinical_dates").insert(date_data).execute()

        logger.info("Database persistence complete.")

    def _parse_iso_date(self, date_str: str) -> Optional[str]:
        """Ensures date is in valid YYYY-MM-DD format for Postgres"""
        if not date_str: return None
        try:
            # Handle full ISO or just date part
            return date_str.split('T')[0]
        except:
            return None
