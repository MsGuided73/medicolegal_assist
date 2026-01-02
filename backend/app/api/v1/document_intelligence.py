"""app.api.v1.document_intelligence

Unified Gemini 2.0 Document Intelligence API Endpoints

This router now owns the end-to-end *upload -> store -> analyze* flow.
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
from app.api.dependencies import get_current_user
from app.services.document_service import DocumentService

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
    case_id: Optional[UUID] = None,
    document_id: Optional[UUID] = None,
    current_user: dict = Depends(get_current_user),
    file: UploadFile = File(...),
    service: MedicalDocumentIntelligence = Depends(get_doc_intelligence_service)
):
    """
    Analyze medical document using Gemini 2.0 Series
    Supports high-capacity mode for records up to 649+ pages.
    """
    
    # NOTE: Backward compatible behavior:
    # - existing frontend calls /document-intelligence/analyze?case_id=...&document_id=...
    # - new storage-based flow can omit document_id; we will create it.

    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(
            status_code=400,
            detail="Only PDF files are supported"
        )

    if case_id is None:
        raise HTTPException(status_code=400, detail="case_id is required")
    
    # Save uploaded file temporarily
    with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp_file:
        content = await file.read()
        tmp_file.write(content)
        tmp_file_path = tmp_file.name
    
    try:
        logger.info(f"Processing document {file.filename} (Case: {case_id})")

        doc_service = DocumentService()

        # 1) Upload to Supabase Storage + create documents row (if document_id not supplied)
        if document_id is None:
            upload = await doc_service.upload_document(
                file_path=tmp_file_path,
                file_name=file.filename,
                case_id=case_id,
                user_id=UUID(current_user["id"]),
                file_size=len(content),
            )
            document_id = upload.document_id
        else:
            # If caller already created a row, we still want the PDF stored. For now,
            # we treat this as legacy behavior and store the file, then keep analyzing.
            upload = await doc_service.upload_document(
                file_path=tmp_file_path,
                file_name=file.filename,
                case_id=case_id,
                user_id=UUID(current_user["id"]),
                file_size=len(content),
            )
            # Prefer the caller-provided ID for downstream analysis persistence.
            # (medical_entities/clinical_dates link via document_id)
            document_id = document_id

        # 2) status -> processing
        await doc_service.update_status(document_id=document_id, status="processing")

        # 3) Analyze using Gemini 2.0 Pipeline
        result = await service.analyze_document(
            pdf_path=tmp_file_path,
            case_id=case_id,
            document_id=document_id,
        )

        # 4) status -> completed (+ metadata)
        await doc_service.update_status(
            document_id=document_id,
            status="completed",
            document_type=result.document_type,
            quality_score=result.quality_score,
        )

        return JSONResponse(content={**asdict(result), "document_id": str(document_id)})
        
    except Exception as e:
        logger.error(f"Gemini analysis failed: {str(e)}")
        try:
            if "document_id" in locals() and document_id is not None:
                await DocumentService().update_status(document_id=document_id, status="failed")
        except Exception:
            pass
        raise HTTPException(
            status_code=500,
            detail=f"Gemini analysis failed: {str(e)}"
        )
    
    finally:
        if os.path.exists(tmp_file_path):
            os.unlink(tmp_file_path)


@router.get("/documents/{case_id}")
async def get_case_documents(
    case_id: UUID,
    current_user: dict = Depends(get_current_user),
):
    """Get all documents for a case."""
    docs = await DocumentService().get_case_documents(case_id=case_id)
    return {"documents": docs}


@router.get("/documents/{document_id}/download")
async def download_document(
    document_id: UUID,
    current_user: dict = Depends(get_current_user),
):
    """Get a signed URL to download a document."""
    url = await DocumentService().get_signed_download_url(document_id=document_id)
    if not url:
        raise HTTPException(status_code=404, detail="Document not found")
    return {"download_url": url}


@router.delete("/documents/{document_id}")
async def delete_document(
    document_id: UUID,
    current_user: dict = Depends(get_current_user),
):
    """Delete a document."""
    await DocumentService().delete_document(document_id=document_id)
    return {"message": "Document deleted successfully"}
