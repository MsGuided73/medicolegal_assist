"""
Documents API Router
"""

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from typing import List, Optional
from uuid import UUID
import os
import shutil

from app.models.case import Case # Using generic Case model for context
from app.services.case_service import CaseService
from app.api.dependencies import get_current_user
from app.core.database import get_supabase_admin

router = APIRouter(prefix="/documents", tags=["documents"])

@router.post("", status_code=status.HTTP_201_CREATED)
async def upload_document(
    case_id: UUID,
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """
    Upload a document to a case
    """
    supabase = get_supabase_admin()
    
    # 1. Store in Supabase Storage (Simplified for validation)
    # real implementation would use self.supabase.storage.from_("documents").upload(...)
    
    try:
        # Register document metadata in DB
        doc_data = {
            "case_id": str(case_id),
            "filename": file.filename,
            "storage_path": f"cases/{case_id}/{file.filename}",
            "ocr_status": "pending"
        }
        
        result = supabase.table("documents").insert(doc_data).execute()
        if not result.data:
            raise Exception("Failed to register document")
            
        return result.data[0]
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Upload registration failed: {str(e)}"
        )

@router.get("/cases/{case_id}", response_model=List[dict])
async def list_case_documents(
    case_id: UUID,
    current_user: dict = Depends(get_current_user)
):
    """List documents for a case"""
    supabase = get_supabase_admin()
    result = supabase.table("documents").select("*").eq("case_id", str(case_id)).execute()
    return result.data
