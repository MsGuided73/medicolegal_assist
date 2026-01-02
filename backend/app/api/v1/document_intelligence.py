"""
Unified Gemini 2.0 Document Intelligence API Endpoints
"""

from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from fastapi.responses import JSONResponse
from typing import Optional
import tempfile
import os
import logging
from dataclasses import asdict

from app.services.gemini_intelligence import GeminiDocumentIntelligence
from app.config import settings
from app.core.database import get_supabase

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/document-intelligence", tags=["Document Intelligence"])


# Initialize Gemini Service
_gemini_service = None

def get_gemini_service() -> GeminiDocumentIntelligence:
    """Get Gemini document intelligence service instance"""
    global _gemini_service
    
    if _gemini_service is None:
        # Note: Using GOOGLE_AI_STUDIO_API_KEY from settings
        _gemini_service = GeminiDocumentIntelligence(
            api_key=os.getenv('GOOGLE_AI_STUDIO_API_KEY', settings.OPENAI_API_KEY) # Fallback to settings
        )
    
    return _gemini_service


@router.post("/analyze", response_model=dict)
async def analyze_document(
    file: UploadFile = File(...),
    high_capacity: bool = True,
    service: GeminiDocumentIntelligence = Depends(get_gemini_service)
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
        logger.info(f"Processing document {file.filename} (High Capacity: {high_capacity})")
        
        # Analyze using Gemini 2.0 Pipeline
        result = await service.analyze_large_document(tmp_file_path)
        
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
