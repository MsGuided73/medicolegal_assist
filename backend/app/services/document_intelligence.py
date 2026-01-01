"""
Medical Document Intelligence Service
Alternative to Azure AI Document Intelligence using Google Vision + Claude
"""

from google.cloud import vision
from anthropic import Anthropic
import io
import json
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, asdict
from datetime import datetime
from pdf2image import convert_from_path
import logging

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
    bounding_box: BoundingBox


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
class DocumentIntelligenceResult:
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


class MedicalDocumentIntelligence:
    """
    Medical Document Intelligence Service
    Combines Google Vision OCR with Claude medical NLP
    """
    
    def __init__(
        self, 
        anthropic_api_key: str,
        google_credentials_path: Optional[str] = None
    ):
        """
        Initialize service
        
        Args:
            anthropic_api_key: Claude API key
            google_credentials_path: Path to Google Cloud credentials JSON
        """
        # Google Vision client will use GOOGLE_APPLICATION_CREDENTIALS env var
        self.vision_client = vision.ImageAnnotatorClient()
        self.claude_client = Anthropic(api_key=anthropic_api_key)
        
    
    async def analyze_document(
        self, 
        pdf_path: str,
        document_type_hint: Optional[str] = None
    ) -> DocumentIntelligenceResult:
        """
        Analyze medical document end-to-end
        
        Args:
            pdf_path: Path to PDF file
            document_type_hint: Optional hint about document type
            
        Returns:
            Complete document intelligence result
        """
        start_time = datetime.now()
        
        logger.info(f"Starting document intelligence analysis: {pdf_path}")
        
        # Step 1: Google Vision OCR + Layout
        logger.info("Step 1: OCR and layout detection with Google Vision")
        ocr_result = await self._process_with_vision(pdf_path)
        
        # Step 2: Classify document type
        logger.info("Step 2: Document classification with Claude")
        doc_type = await self._classify_document(
            ocr_result['text'],
            document_type_hint
        )
        
        # Step 3: Extract sections
        logger.info("Step 3: Section extraction")
        sections = await self._extract_sections(
            ocr_result['text'],
            doc_type
        )
        
        # Step 4: Extract medical entities
        logger.info("Step 4: Medical entity extraction with Claude")
        entities = await self._extract_medical_entities(
            ocr_result['text'],
            doc_type
        )
        
        # Step 5: Extract clinical dates
        logger.info("Step 5: Clinical date extraction")
        dates = await self._extract_clinical_dates(
            ocr_result['text']
        )
        
        # Step 6: Calculate quality score
        quality_score = self._calculate_quality_score(
            ocr_result['confidence'],
            len(entities),
            len(dates),
            len(sections)
        )
        
        processing_time = (datetime.now() - start_time).total_seconds()
        
        result = DocumentIntelligenceResult(
            document_type=doc_type,
            ocr_text=ocr_result['text'],
            ocr_confidence=ocr_result['confidence'],
            sections=sections,
            tables=ocr_result['tables'],
            medical_entities=entities,
            clinical_dates=dates,
            page_count=ocr_result['page_count'],
            processing_time=processing_time,
            quality_score=quality_score
        )
        
        logger.info(f"Analysis complete in {processing_time:.2f}s")
        
        return result
    
    
    async def _process_with_vision(self, pdf_path: str) -> Dict[str, Any]:
        """
        Process document with Google Cloud Vision
        Extracts text, layout, and tables
        """
        # Convert PDF to images
        images = convert_from_path(pdf_path, dpi=300)
        
        all_text = []
        all_tables = []
        confidences = []
        
        for page_num, image in enumerate(images, start=1):
            # Convert PIL image to bytes
            img_byte_arr = io.BytesIO()
            image.save(img_byte_arr, format='PNG')
            img_byte_arr = img_byte_arr.getvalue()
            
            # Create Vision API image
            vision_image = vision.Image(content=img_byte_arr)
            
            # Detect document text with layout
            response = self.vision_client.document_text_detection(
                image=vision_image
            )
            
            # Extract full text
            if response.full_text_annotation:
                page_text = response.full_text_annotation.text
                all_text.append(page_text)
                
                # Calculate confidence
                page_confidence = self._calculate_page_confidence(
                    response.full_text_annotation
                )
                confidences.append(page_confidence)
            
            # Extract tables
            tables = self._extract_tables_from_vision(
                response,
                page_num
            )
            all_tables.extend(tables)
        
        avg_confidence = sum(confidences) / len(confidences) if confidences else 0
        
        return {
            'text': '\n\n'.join(all_text),
            'tables': all_tables,
            'confidence': avg_confidence,
            'page_count': len(images)
        }
    
    
    def _calculate_page_confidence(self, annotation) -> float:
        """Calculate average confidence for a page"""
        if not annotation.pages:
            return 0.0
        
        confidences = []
        for page in annotation.pages:
            for block in page.blocks:
                if hasattr(block, 'confidence'):
                    confidences.append(block.confidence)
        
        return sum(confidences) / len(confidences) if confidences else 0.0
    
    
    def _extract_tables_from_vision(
        self, 
        response,
        page_number: int
    ) -> List[Table]:
        """
        Extract table structures from Vision API response
        """
        tables = []
        
        if not response.full_text_annotation:
            return tables
        
        # Google Vision provides tables in the response
        # This is a simplified extraction - production would be more sophisticated
        for page in response.full_text_annotation.pages:
            for block in page.blocks:
                # Check if block looks like a table (heuristic)
                if self._is_table_block(block):
                    table = self._parse_table_block(block, page_number)
                    if table:
                        tables.append(table)
        
        return tables
    
    
    def _is_table_block(self, block) -> bool:
        """Heuristic to detect if a block is a table"""
        # Check for grid-like structure
        # This is simplified - production would use more sophisticated detection
        if len(block.paragraphs) < 2:
            return False
        
        # Check for consistent spacing/alignment
        # (Implementation would go here)
        
        return False  # Placeholder
    
    
    def _parse_table_block(self, block, page_number: int) -> Optional[Table]:
        """Parse a table block into structured table"""
        # Placeholder - production would parse cells, rows, columns
        return None
    
    
    async def _classify_document(
        self,
        text: str,
        hint: Optional[str] = None
    ) -> str:
        """
        Classify document type using Claude
        """
        
        prompt = f"""Classify this medical document into one of these categories:
        
Categories:
- progress_note
- operative_report
- emergency_department_record
- consultation_note
- imaging_report (X-ray, MRI, CT)
- physical_therapy_note
- injection_note
- discharge_summary
- history_physical
- laboratory_report
- pathology_report
- other

Document text (first 2000 characters):
{text[:2000]}

{"Document type hint: " + hint if hint else ""}

Respond with ONLY the category name, nothing else."""

        response = self.claude_client.messages.create(
            model="claude-3-5-sonnet-20240620",
            max_tokens=50,
            temperature=0,
            messages=[{"role": "user", "content": prompt}]
        )
        
        doc_type = response.content[0].text.strip().lower()
        return doc_type
    
    
    async def _extract_sections(
        self,
        text: str,
        doc_type: str
    ) -> List[DocumentSection]:
        """
        Extract document sections using Claude
        """
        
        prompt = f"""This is a {doc_type}. Extract all major sections from this document.

For each section, provide:
1. Section title
2. Section type (subjective, objective, assessment, plan, history, examination, etc.)
3. Full section content

Document:
{text}

Return as JSON array:
[
  {{
    "title": "Chief Complaint",
    "section_type": "subjective",
    "content": "Patient reports..."
  }},
  ...
]

Return ONLY the JSON array, no other text."""

        response = self.claude_client.messages.create(
            model="claude-3-5-sonnet-20240620",
            max_tokens=4000,
            temperature=0,
            messages=[{"role": "user", "content": prompt}]
        )
        
        # Parse JSON response
        try:
            sections_data = json.loads(response.content[0].text)
            
            sections = [
                DocumentSection(
                    title=s['title'],
                    content=s['content'],
                    section_type=s['section_type'],
                    page_number=1,  # Would need to map back to pages
                    confidence=0.85  # Claude is generally high confidence
                )
                for s in sections_data
            ]
            
            return sections
            
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse sections JSON: {e}")
            return []
    
    
    async def _extract_medical_entities(
        self,
        text: str,
        doc_type: str
    ) -> List[MedicalEntity]:
        """
        Extract medical entities using Claude
        """
        
        prompt = f"""Extract all medical entities from this {doc_type}.

Categories:
- diagnosis (with ICD-10 code if identifiable)
- medication (name, dose, frequency)
- procedure (surgeries, injections, imaging)
- symptom (pain, numbness, weakness, etc.)
- anatomical_location (body parts/regions)
- vital_sign (BP, HR, temp, etc.)
- lab_value (test results)
- finding (exam findings, imaging findings)

Document:
{text}

Return as JSON array:
[
  {{
    "text": "Right shoulder rotator cuff tear",
    "category": "diagnosis",
    "icd10_code": "M75.121",
    "confidence": 0.95,
    "source_text": "MRI reveals full-thickness rotator cuff tear of the right shoulder"
  }},
  {{
    "text": "Ibuprofen 600mg",
    "category": "medication",
    "confidence": 0.90,
    "source_text": "Patient taking ibuprofen 600mg three times daily"
  }},
  ...
]

Return ONLY the JSON array."""

        response = self.claude_client.messages.create(
            model="claude-3-5-sonnet-20240620",
            max_tokens=6000,
            temperature=0.2,
            messages=[{"role": "user", "content": prompt}]
        )
        
        # Parse JSON response
        try:
            entities_data = json.loads(response.content[0].text)
            
            entities = [
                MedicalEntity(
                    text=e['text'],
                    category=e['category'],
                    icd10_code=e.get('icd10_code'),
                    confidence=e.get('confidence', 0.8),
                    source_text=e.get('source_text')
                )
                for e in entities_data
            ]
            
            return entities
            
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse entities JSON: {e}")
            return []
    
    
    async def _extract_clinical_dates(
        self,
        text: str
    ) -> List[ClinicalDate]:
        """
        Extract clinical dates using Claude
        """
        
        prompt = f"""Extract all clinically significant dates from this document.

Date types:
- injury_date (when injury occurred)
- service_date (date of this visit/report)
- surgery_date
- imaging_date
- follow_up_date
- symptom_onset_date
- treatment_start_date
- treatment_end_date

Document:
{text}

Return as JSON array with ISO format dates:
[
  {{
    "date": "2024-03-15",
    "date_type": "injury_date",
    "confidence": 0.95,
    "source_text": "Patient injured on March 15, 2024"
  }},
  ...
]

Return ONLY the JSON array."""

        response = self.claude_client.messages.create(
            model="claude-3-5-sonnet-20240620",
            max_tokens=2000,
            temperature=0,
            messages=[{"role": "user", "content": prompt}]
        )
        
        # Parse JSON response
        try:
            dates_data = json.loads(response.content[0].text)
            
            dates = [
                ClinicalDate(
                    date=d['date'],
                    date_type=d['date_type'],
                    confidence=d.get('confidence', 0.8),
                    page_number=1,  # Would map back to pages
                    source_text=d.get('source_text', '')
                )
                for d in dates_data
            ]
            
            return dates
            
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse dates JSON: {e}")
            return []
    
    
    def _calculate_quality_score(
        self,
        ocr_confidence: float,
        entity_count: int,
        date_count: int,
        section_count: int
    ) -> float:
        """
        Calculate overall document quality score
        """
        # Weight OCR confidence heavily
        score = ocr_confidence * 0.5
        
        # Reward entity extraction
        entity_score = min(entity_count / 20, 1.0) * 0.25
        score += entity_score
        
        # Reward date extraction
        date_score = min(date_count / 5, 1.0) * 0.15
        score += date_score
        
        # Reward section detection
        section_score = min(section_count / 8, 1.0) * 0.10
        score += section_score
        
        return round(score, 2)
