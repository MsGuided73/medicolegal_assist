"""
Unified Gemini 2.0 Document Intelligence API Endpoints
"""

from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from fastapi.responses import JSONResponse
from typing import Optional
from uuid import UUID
import tempfile
import os
import logging
from dataclasses import asdict

from app.services.document_intelligence import MedicalDocumentIntelligence
from app.config import settings
from app.core.database import get_supabase

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/document-intelligence", tags=["Document Intelligence"])


# Initialize Document Intelligence Service
_doc_intelligence_service = None

def get_doc_intelligence_service() -> MedicalDocumentIntelligence:
    """Get document intelligence service instance"""
    global _doc_intelligence_service
    
    if _doc_intelligence_service is None:
        # Note: Using GOOGLE_AI_STUDIO_API_KEY from settings/env
        api_key = os.getenv('GOOGLE_AI_STUDIO_API_KEY')
        if not api_key:
            raise RuntimeError("GOOGLE_AI_STUDIO_API_KEY not found in environment")
            
        _doc_intelligence_service = MedicalDocumentIntelligence(
            api_key=api_key
        )
    
    return _doc_intelligence_service


@router.post("/analyze", response_model=dict)
async def analyze_document(
    case_id: UUID,
    document_id: UUID,
    file: UploadFile = File(...),
    high_capacity: bool = True,
    service: MedicalDocumentIntelligence = Depends(get_doc_intelligence_service)
):
    """
    Analyze medical document using Gemini 2.0 Series
    Supports high-capacity mode for records up to 649+ pages.
    """
    
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
        logger.info(f"Processing document {file.filename} (High Capacity: {high_capacity}, Case: {case_id})")
        
        # Analyze using Gemini 2.0 Pipeline (already High-Capacity by default in the service)
        result = await service.analyze_document(
            pdf_path=tmp_file_path,
            case_id=case_id,
            document_id=document_id
        )
        
        return JSONResponse(content=asdict(result))
        
    except Exception as e:
        logger.error(f"Gemini analysis failed: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Gemini analysis failed: {str(e)}"
        )
    
    finally:
        if os.path.exists(tmp_file_path):
            os.unlink(tmp_file_path)
