"""
Document Intelligence API Endpoints
"""

from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from fastapi.responses import JSONResponse
from typing import Optional
import tempfile
import os

from app.services.document_intelligence import (
    MedicalDocumentIntelligence,
    DocumentIntelligenceResult
)
from app.config import settings
from app.core.database import get_supabase

router = APIRouter(prefix="/document-intelligence", tags=["Document Intelligence"])


# Initialize service (singleton)
_doc_intelligence_service = None

def get_doc_intelligence_service() -> MedicalDocumentIntelligence:
    """Get document intelligence service instance"""
    global _doc_intelligence_service
    
    if _doc_intelligence_service is None:
        _doc_intelligence_service = MedicalDocumentIntelligence(
            anthropic_api_key=settings.ANTHROPIC_API_KEY,
            google_credentials_path=os.getenv('GOOGLE_APPLICATION_CREDENTIALS')
        )
    
    return _doc_intelligence_service


@router.post("/analyze", response_model=dict)
async def analyze_document(
    file: UploadFile = File(...),
    document_type_hint: Optional[str] = None,
    service: MedicalDocumentIntelligence = Depends(get_doc_intelligence_service)
):
    """
    Analyze medical document with full intelligence extraction
    
    Returns:
    - Document classification
    - Extracted sections
    - Medical entities (diagnoses, medications, etc.)
    - Clinical dates
    - Tables
    - Quality metrics
    """
    
    # Validate file type
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(
            status_code=400,
            detail="Only PDF files are supported"
        )
    
    # Save uploaded file temporarily
    with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp_file:
        content = await file.read()
        tmp_file.write(content)
        tmp_file_path = tmp_file.name
    
    try:
        # Analyze document
        result = await service.analyze_document(
            pdf_path=tmp_file_path,
            document_type_hint=document_type_hint
        )
        
        # Convert to dict for JSON response
        from dataclasses import asdict
        result_dict = asdict(result)
        
        return JSONResponse(content=result_dict)
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Document analysis failed: {str(e)}"
        )
    
    finally:
        # Clean up temp file
        if os.path.exists(tmp_file_path):
            os.unlink(tmp_file_path)


@router.post("/extract-entities", response_model=dict)
async def extract_entities_only(
    file: UploadFile = File(...),
    entity_types: Optional[str] = None, # Comma separated list
    service: MedicalDocumentIntelligence = Depends(get_doc_intelligence_service)
):
    """
    Extract only medical entities (faster, cheaper)
    
    Args:
        file: PDF file
        entity_types: Optional filter (e.g., 'diagnosis,medication')
    
    Returns:
        List of medical entities
    """
    
    # Save uploaded file temporarily
    with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp_file:
        content = await file.read()
        tmp_file.write(content)
        tmp_file_path = tmp_file.name
    
    try:
        # Run OCR only
        ocr_result = await service._process_with_vision(tmp_file_path)
        
        # Get document type
        doc_type = await service._classify_document(ocr_result['text'])
        
        # Extract entities
        entities = await service._extract_medical_entities(
            ocr_result['text'],
            doc_type
        )
        
        # Filter by type if requested
        if entity_types:
            types_list = [t.strip() for t in entity_types.split(',')]
            entities = [
                e for e in entities 
                if e.category in types_list
            ]
        
        from dataclasses import asdict
        return {
            "document_type": doc_type,
            "entity_count": len(entities),
            "entities": [asdict(e) for e in entities]
        }
        
    finally:
        if os.path.exists(tmp_file_path):
            os.unlink(tmp_file_path)


@router.post("/extract-dates", response_model=dict)
async def extract_dates_only(
    file: UploadFile = File(...),
    service: MedicalDocumentIntelligence = Depends(get_doc_intelligence_service)
):
    """
    Extract only clinical dates (faster, cheaper)
    """
    
    with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp_file:
        content = await file.read()
        tmp_file.write(content)
        tmp_file_path = tmp_file.name
    
    try:
        # Run OCR only
        ocr_result = await service._process_with_vision(tmp_file_path)
        
        # Extract dates
        dates = await service._extract_clinical_dates(ocr_result['text'])
        
        from dataclasses import asdict
        return {
            "date_count": len(dates),
            "dates": [asdict(d) for d in dates]
        }
        
    finally:
        if os.path.exists(tmp_file_path):
            os.unlink(tmp_file_path)
