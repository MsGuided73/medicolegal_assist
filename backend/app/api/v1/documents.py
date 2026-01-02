"""
Documents API Router
"""

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Body
from typing import List, Optional
from uuid import UUID
import os
import shutil
import tempfile

from app.models.case import Case # Using generic Case model for context
from app.services.case_service import CaseService
from app.api.dependencies import get_current_user
from app.core.database import get_supabase_admin
from app.services.document_intelligence import MedicalDocumentIntelligence

router = APIRouter(prefix="/documents", tags=["documents"])


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_document_entry(
    payload: dict | None = Body(default=None),
    case_id: UUID | None = None,
    file: UploadFile | None = None,
    current_user: dict = Depends(get_current_user)
):
    """Compatibility endpoint for frontend.

    The frontend currently POSTs JSON to `/documents` to create a document entry
    before uploading/analyzing. The more correct API is multipart upload.

    To avoid 422s and keep the UI unblocked, we accept JSON here and create the
    `documents` row.

    If a multipart upload is sent instead (case_id + file), we also accept it.
    """
    supabase = get_supabase_admin()

    try:
        # Branch based on content type
        if file is not None:
            if case_id is None:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="case_id is required when uploading a file"
                )

            filename = file.filename
            document_type = None
            case_id_str = str(case_id)
        else:
            if not payload:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="JSON body required"
                )
            case_id_str = payload.get("case_id")
            filename = payload.get("filename")
            document_type = payload.get("document_type")

        if not case_id_str or not filename:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="case_id and filename are required"
            )

        doc_data = {
            "case_id": str(case_id_str),
            "filename": filename,
            "document_type": document_type,
            "storage_path": f"cases/{case_id_str}/{filename}",
            "ocr_status": "pending",
        }

        result = supabase.table("documents").insert(doc_data).execute()
        if not result.data:
            raise Exception("Failed to register document")

        return result.data[0]

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Create document entry failed: {str(e)}"
        )

@router.post("/analyze", status_code=status.HTTP_200_OK)
async def analyze_document(
    case_id: UUID,
    document_id: UUID,
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """
    Analyze a document using Gemini 2.0
    """
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(
            status_code=400,
            detail="Only PDF files are supported"
        )
    
    # Initialize document intelligence service
    api_key = os.getenv('GOOGLE_AI_STUDIO_API_KEY')
    if not api_key:
        raise HTTPException(
            status_code=500,
            detail="Document intelligence service not configured"
        )
    
    service = MedicalDocumentIntelligence(api_key=api_key)
    
    # Save uploaded file temporarily
    with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp_file:
        content = await file.read()
        tmp_file.write(content)
        tmp_file_path = tmp_file.name
    
    try:
        # Analyze document
        result = await service.analyze_document(
            pdf_path=tmp_file_path,
            case_id=case_id,
            document_id=document_id
        )
        
        return {"message": "Analysis completed", "result": result}
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Analysis failed: {str(e)}"
        )
    
    finally:
        if os.path.exists(tmp_file_path):
            os.unlink(tmp_file_path)

@router.get("/cases/{case_id}", response_model=List[dict])
async def list_case_documents(
    case_id: UUID,
    current_user: dict = Depends(get_current_user)
):
    """List documents for a case"""
    supabase = get_supabase_admin()
    result = supabase.table("documents").select("*").eq("case_id", str(case_id)).execute()
    return result.data
