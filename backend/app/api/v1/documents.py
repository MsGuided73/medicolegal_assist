"""
Documents API Router - Enhanced with Working Upload & Processing
Complete Supabase Storage integration + background processing
"""

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, BackgroundTasks
from pydantic import BaseModel
from pathlib import PurePosixPath
from typing import List, Optional
from uuid import UUID, uuid4
import os
import logging
from datetime import datetime

from app.models.case import Case
from app.services.case_service import CaseService
from app.services.document_intelligence import MedicalDocumentIntelligence
from app.api.dependencies import get_current_user
from app.core.database import get_supabase_admin
from app.config import settings

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/documents", tags=["documents"])


class RegisterExistingItem(BaseModel):
    storage_path: str
    filename: Optional[str] = None
    document_type: Optional[str] = None


class RegisterExistingRequest(BaseModel):
    case_id: str
    items: Optional[List[RegisterExistingItem]] = None
    # Allow single-item payloads
    storage_path: Optional[str] = None
    filename: Optional[str] = None
    document_type: Optional[str] = None


class RegisterExistingResult(BaseModel):
    document_id: Optional[str] = None
    storage_path: str
    filename: str
    status: str  # registered | already_registered | not_found | invalid


class RegisterExistingResponse(BaseModel):
    case_id: str
    results: List[RegisterExistingResult]


def _sanitize_storage_path(p: str) -> str:
    p = (p or "").strip()
    if not p:
        return ""
    # Disallow path traversal
    if ".." in PurePosixPath(p).parts:
        return ""
    return p


def _infer_filename(storage_path: str, provided_filename: Optional[str]) -> str:
    if provided_filename and provided_filename.strip():
        return provided_filename.strip()
    return PurePosixPath(storage_path).name


def _is_pdf_filename(filename: str) -> bool:
    return filename.lower().endswith(".pdf")


def _storage_object_exists(supabase_admin, bucket: str, object_key: str) -> bool:
    # Supabase storage list() requires a prefix (folder). Use dirname.
    path = PurePosixPath(object_key)
    prefix = str(path.parent)
    if prefix == ".":
        prefix = ""
    name = path.name

    listed = supabase_admin.storage.from_(bucket).list(prefix)
    # Python client returns list[dict] typically.
    for obj in listed or []:
        if obj.get("name") == name:
            return True
    return False


@router.post("/register-existing", response_model=RegisterExistingResponse)
async def register_existing_storage_objects(
    payload: RegisterExistingRequest,
    current_user: dict = Depends(get_current_user),
):
    """Register already-uploaded storage objects into public.documents.

    storage_path MUST be the object key inside bucket `documents` (no bucket prefix).
    """

    # Validate case_id (avoid 422)
    if not payload.case_id:
        raise HTTPException(status_code=400, detail="case_id is required")
    try:
        case_uuid = UUID(payload.case_id)
    except Exception:
        raise HTTPException(status_code=400, detail="case_id must be a valid UUID")

    # Normalize to items
    items: List[RegisterExistingItem] = []
    if payload.items:
        items = payload.items
    elif payload.storage_path:
        items = [
            RegisterExistingItem(
                storage_path=payload.storage_path,
                filename=payload.filename,
                document_type=payload.document_type,
            )
        ]
    else:
        raise HTTPException(status_code=400, detail="items or storage_path is required")

    supabase = get_supabase_admin()  # service role

    # Verify user has access to case
    case_service = CaseService()
    case = await case_service.get_case(case_uuid, UUID(current_user["id"]))
    if not case:
        raise HTTPException(status_code=403, detail=f"Access denied for case_id {case_uuid}")

    results: List[RegisterExistingResult] = []

    for item in items:
        object_key = _sanitize_storage_path(item.storage_path)
        filename = _infer_filename(item.storage_path, item.filename)

        if not object_key or not filename or not _is_pdf_filename(filename):
            results.append(
                RegisterExistingResult(
                    document_id=None,
                    storage_path=item.storage_path,
                    filename=filename or (item.filename or ""),
                    status="invalid",
                )
            )
            continue

        # Verify object exists in Storage
        try:
            exists = _storage_object_exists(supabase, "documents", object_key)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Storage list failed: {str(e)}")

        if not exists:
            results.append(
                RegisterExistingResult(
                    document_id=None,
                    storage_path=object_key,
                    filename=filename,
                    status="not_found",
                )
            )
            continue

        # Idempotent insert: unique on (case_id, storage_path)
        try:
            existing = (
                supabase.table("documents")
                .select("id")
                .eq("case_id", str(case_uuid))
                .eq("storage_path", object_key)
                .limit(1)
                .execute()
            )
            if existing.data:
                results.append(
                    RegisterExistingResult(
                        document_id=existing.data[0]["id"],
                        storage_path=object_key,
                        filename=filename,
                        status="already_registered",
                    )
                )
                continue

            doc_data = {
                "case_id": str(case_uuid),
                "filename": filename,
                "storage_path": object_key,
                "document_type": item.document_type,
                "created_by": str(UUID(current_user["id"])),
                "ocr_status": "pending",
                "intelligence_result": {},
            }

            inserted = supabase.table("documents").insert(doc_data).execute()
            if not inserted.data:
                raise HTTPException(status_code=500, detail="Failed to insert documents row")

            results.append(
                RegisterExistingResult(
                    document_id=inserted.data[0]["id"],
                    storage_path=object_key,
                    filename=filename,
                    status="registered",
                )
            )
        except HTTPException:
            raise
        except Exception as e:
            # If unique index exists, we might race; fallback to fetch.
            msg = str(e)
            try:
                existing2 = (
                    supabase.table("documents")
                    .select("id")
                    .eq("case_id", str(case_uuid))
                    .eq("storage_path", object_key)
                    .limit(1)
                    .execute()
                )
                if existing2.data:
                    results.append(
                        RegisterExistingResult(
                            document_id=existing2.data[0]["id"],
                            storage_path=object_key,
                            filename=filename,
                            status="already_registered",
                        )
                    )
                    continue
            except Exception:
                pass
            raise HTTPException(status_code=500, detail=f"Register failed for {object_key}: {msg}")

    return RegisterExistingResponse(case_id=str(case_uuid), results=results)

# Initialize services
_doc_intelligence_service = None

def get_doc_intelligence_service() -> MedicalDocumentIntelligence:
    """Get document intelligence service instance"""
    global _doc_intelligence_service
    
    if _doc_intelligence_service is None:
        api_key = settings.GOOGLE_AI_STUDIO_API_KEY
        if not api_key:
            raise RuntimeError("GOOGLE_AI_STUDIO_API_KEY not configured")
            
        _doc_intelligence_service = MedicalDocumentIntelligence(api_key=api_key)
    
    return _doc_intelligence_service


@router.post("", status_code=status.HTTP_201_CREATED)
async def upload_document(
    background_tasks: BackgroundTasks,
    case_id: Optional[str] = None,
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """
    Upload a document to a case with automatic processing
    
    - **case_id**: UUID of the case to attach document to
    - **file**: PDF file (max 50MB)
    
    Returns:
    - Document metadata with processing status
    """
    
    # --- Normalize/validate params (avoid FastAPI 422) ---
    logger.info("upload_document request params: case_id=%s filename=%s", case_id, getattr(file, "filename", None))

    if not case_id:
        raise HTTPException(status_code=400, detail="case_id is required")
    try:
        case_uuid = UUID(case_id)
    except Exception:
        raise HTTPException(status_code=400, detail="case_id must be a valid UUID")

    # Validate file
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(
            status_code=400,
            detail="Only PDF files are supported"
        )
    
    # Check file size (50MB limit)
    file_content = await file.read()
    if len(file_content) > 50 * 1024 * 1024:  # 50MB
        raise HTTPException(
            status_code=400,
            detail="File size must be less than 50MB"
        )
    
    # Reset file pointer for storage
    await file.seek(0)
    
    supabase = get_supabase_admin()
    
    try:
        # 1. Verify case exists and user has access
        case_service = CaseService()
        case = await case_service.get_case(case_uuid, UUID(current_user["id"]))
        if not case:
            raise HTTPException(
                status_code=404,
                detail=f"Case {case_uuid} not found or access denied"
            )
        
        # 2. Generate storage path
        document_id = uuid4()
        storage_path = f"cases/{case_uuid}/{document_id}/{file.filename}"
        
        logger.info(f"Uploading document: {file.filename} to {storage_path}")
        
        # 3. Upload to Supabase Storage
        try:
            storage_result = supabase.storage.from_("documents").upload(
                path=storage_path,
                file=file_content,
                file_options={
                    "content-type": "application/pdf",
                    "upsert": False
                }
            )
            
            if hasattr(storage_result, 'error') and storage_result.error:
                raise Exception(f"Storage upload failed: {storage_result.error}")
                
        except Exception as storage_error:
            logger.error(f"Supabase storage error: {str(storage_error)}")
            raise HTTPException(
                status_code=500,
                detail=f"File upload failed: {str(storage_error)}"
            )
        
        # 4. Register document in database
        doc_data = {
            "id": str(document_id),
            "case_id": str(case_uuid),
            "filename": file.filename,
            "storage_path": storage_path,
            "document_type": "medical_record",  # Default type
            "quality_score": None,
            "ocr_status": "pending",
            "intelligence_result": {},
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat()
        }
        
        result = supabase.table("documents").insert(doc_data).execute()
        if not result.data:
            # Cleanup storage if database insert fails
            try:
                supabase.storage.from_("documents").remove([storage_path])
            except:
                pass
            raise HTTPException(
                status_code=500,
                detail="Failed to register document in database"
            )
        
        document = result.data[0]
        
        # 5. Start background processing
        background_tasks.add_task(
            process_document_background,
            document_id=document_id,
            case_id=case_uuid,
            storage_path=storage_path,
            user_id=UUID(current_user["id"])
        )
        
        logger.info(f"Document uploaded and processing started: {document_id}")
        
        return {
            **document,
            "message": "Document uploaded successfully. Processing started in background.",
            "processing_status": "pending",
            "storage_path": storage_path,
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Document upload failed: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Upload failed: {str(e)}"
        )


@router.get("/cases/{case_id}", response_model=List[dict])
async def list_case_documents(
    case_id: UUID,
    current_user: dict = Depends(get_current_user)
):
    """
    List all documents for a case with processing status
    
    - **case_id**: UUID of the case
    
    Returns:
    - List of document metadata with processing status and results
    """
    try:
        # Verify case access
        case_service = CaseService()
        case = await case_service.get_case(case_id, UUID(current_user["id"]))
        if not case:
            raise HTTPException(
                status_code=404,
                detail=f"Case {case_id} not found or access denied"
            )
        
        supabase = get_supabase_admin()
        
        # Get documents with enhanced status info
        result = supabase.table("documents")\
            .select("*, medical_entities(count), clinical_dates(count)")\
            .eq("case_id", str(case_id))\
            .order("created_at", desc=True)\
            .execute()
        
        documents = []
        for doc in result.data:
            # Enhance with processing stats
            doc_enhanced = {
                **doc,
                "entities_extracted": doc.get("medical_entities", [{}])[0].get("count", 0) if doc.get("medical_entities") else 0,
                "dates_extracted": doc.get("clinical_dates", [{}])[0].get("count", 0) if doc.get("clinical_dates") else 0,
                "processing_complete": doc.get("ocr_status") == "completed",
                "has_results": bool(doc.get("intelligence_result", {}).get("medical_entities"))
            }
            documents.append(doc_enhanced)
        
        return documents
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to list documents: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to list documents: {str(e)}"
        )


@router.get("/{document_id}")
async def get_document(
    document_id: UUID,
    current_user: dict = Depends(get_current_user)
):
    """
    Get document details with processing results
    
    - **document_id**: UUID of the document
    
    Returns:
    - Complete document metadata with AI analysis results
    """
    try:
        supabase = get_supabase_admin()
        
        # Get document with case info for access control
        doc_result = supabase.table("documents")\
            .select("*, cases!inner(*)")\
            .eq("id", str(document_id))\
            .single()\
            .execute()
        
        if not doc_result.data:
            raise HTTPException(
                status_code=404,
                detail="Document not found"
            )
        
        document = doc_result.data
        case = document["cases"]
        
        # Check access (same logic as case access)
        user_id = UUID(current_user["id"])
        if (case["assigned_physician_id"] != str(user_id) and 
            current_user["role"] != "admin"):
            raise HTTPException(
                status_code=403,
                detail="Access denied"
            )
        
        # Get related entities and dates
        entities_result = supabase.table("medical_entities")\
            .select("*")\
            .eq("document_id", str(document_id))\
            .execute()
        
        dates_result = supabase.table("clinical_dates")\
            .select("*")\
            .eq("document_id", str(document_id))\
            .order("date_value")\
            .execute()
        
        # Combine into comprehensive response
        return {
            **document,
            "case": case,
            "medical_entities": entities_result.data,
            "clinical_dates": dates_result.data,
            "processing_complete": document.get("ocr_status") == "completed",
            "total_entities": len(entities_result.data),
            "total_dates": len(dates_result.data)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get document: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get document: {str(e)}"
        )


@router.post("/{document_id}/reprocess")
async def reprocess_document(
    document_id: UUID,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user)
):
    """
    Reprocess a document (in case of processing failure or updates needed)
    
    - **document_id**: UUID of the document to reprocess
    
    Returns:
    - Processing status
    """
    try:
        supabase = get_supabase_admin()
        
        # Get document with access control
        doc_result = supabase.table("documents")\
            .select("*, cases!inner(*)")\
            .eq("id", str(document_id))\
            .single()\
            .execute()
        
        if not doc_result.data:
            raise HTTPException(
                status_code=404,
                detail="Document not found"
            )
        
        document = doc_result.data
        case = document["cases"]
        
        # Check access
        user_id = UUID(current_user["id"])
        if (case["assigned_physician_id"] != str(user_id) and 
            current_user["role"] != "admin"):
            raise HTTPException(
                status_code=403,
                detail="Access denied"
            )
        
        # Reset processing status
        supabase.table("documents")\
            .update({
                "ocr_status": "pending",
                "intelligence_result": {},
                "updated_at": datetime.utcnow().isoformat()
            })\
            .eq("id", str(document_id))\
            .execute()
        
        # Clear existing extracted data
        supabase.table("medical_entities").delete().eq("document_id", str(document_id)).execute()
        supabase.table("clinical_dates").delete().eq("document_id", str(document_id)).execute()
        
        # Start reprocessing
        background_tasks.add_task(
            process_document_background,
            document_id=document_id,
            case_id=UUID(case["id"]),
            storage_path=document["storage_path"],
            user_id=user_id
        )
        
        logger.info(f"Document reprocessing started: {document_id}")
        
        return {
            "message": "Document reprocessing started",
            "document_id": str(document_id),
            "status": "pending"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to reprocess document: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Reprocessing failed: {str(e)}"
        )


@router.delete("/{document_id}")
async def delete_document(
    document_id: UUID,
    current_user: dict = Depends(get_current_user)
):
    """
    Delete a document (removes from storage and database)
    
    - **document_id**: UUID of the document to delete
    
    Returns:
    - Deletion confirmation
    """
    try:
        supabase = get_supabase_admin()
        
        # Get document with access control
        doc_result = supabase.table("documents")\
            .select("*, cases!inner(*)")\
            .eq("id", str(document_id))\
            .single()\
            .execute()
        
        if not doc_result.data:
            raise HTTPException(
                status_code=404,
                detail="Document not found"
            )
        
        document = doc_result.data
        case = document["cases"]
        
        # Check access
        user_id = UUID(current_user["id"])
        if (case["assigned_physician_id"] != str(user_id) and 
            current_user["role"] != "admin"):
            raise HTTPException(
                status_code=403,
                detail="Access denied"
            )
        
        storage_path = document["storage_path"]
        
        # Delete from storage (best effort - don't fail if storage delete fails)
        try:
            supabase.storage.from_("documents").remove([storage_path])
        except Exception as storage_error:
            logger.warning(f"Storage deletion failed (continuing): {storage_error}")
        
        # Delete from database (cascading will handle related data)
        supabase.table("documents").delete().eq("id", str(document_id)).execute()
        
        logger.info(f"Document deleted: {document_id}")
        
        return {
            "message": "Document deleted successfully",
            "document_id": str(document_id)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete document: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Deletion failed: {str(e)}"
        )


# ============================================================================
# BACKGROUND PROCESSING FUNCTIONS
# ============================================================================

async def process_document_background(
    document_id: UUID,
    case_id: UUID,
    storage_path: str,
    user_id: UUID
):
    """
    Background task for document processing
    """
    logger.info(f"Starting background processing for document {document_id}")
    
    supabase = get_supabase_admin()
    
    try:
        # Update status to processing
        supabase.table("documents")\
            .update({
                "ocr_status": "processing",
                "updated_at": datetime.utcnow().isoformat()
            })\
            .eq("id", str(document_id))\
            .execute()
        
        # Download file from storage
        try:
            file_response = supabase.storage.from_("documents").download(storage_path)
            if not file_response:
                raise Exception("Failed to download file from storage")
                
        except Exception as download_error:
            logger.error(f"Download failed: {download_error}")
            supabase.table("documents")\
                .update({
                    "ocr_status": "failed",
                    "updated_at": datetime.utcnow().isoformat()
                })\
                .eq("id", str(document_id))\
                .execute()
            return
        
        # Save to temporary file for processing
        import tempfile
        with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp_file:
            tmp_file.write(file_response)
            tmp_file_path = tmp_file.name
        
        try:
            # Process with document intelligence
            doc_service = get_doc_intelligence_service()
            result = await doc_service.analyze_document(
                pdf_path=tmp_file_path,
                case_id=case_id,
                document_id=document_id
            )
            
            # Update document with results
            supabase.table("documents")\
                .update({
                    "ocr_status": "completed",
                    "document_type": result.document_type,
                    "quality_score": result.quality_score,
                    "intelligence_result": {
                        "page_count": result.page_count,
                        "processing_time": result.processing_time,
                        "quality_score": result.quality_score,
                        "entities_count": len(result.medical_entities),
                        "dates_count": len(result.clinical_dates),
                        "sections_count": len(result.sections)
                    },
                    "updated_at": datetime.utcnow().isoformat()
                })\
                .eq("id", str(document_id))\
                .execute()
            
            logger.info(f"Document processing completed successfully: {document_id}")
            
        except Exception as processing_error:
            logger.error(f"Document processing failed: {processing_error}")
            supabase.table("documents")\
                .update({
                    "ocr_status": "failed",
                    "updated_at": datetime.utcnow().isoformat()
                })\
                .eq("id", str(document_id))\
                .execute()
            
        finally:
            # Cleanup temp file
            try:
                os.unlink(tmp_file_path)
            except:
                pass
            
    except Exception as e:
        logger.error(f"Background processing error: {str(e)}")
        try:
            supabase.table("documents")\
                .update({
                    "ocr_status": "failed",
                    "updated_at": datetime.utcnow().isoformat()
                })\
                .eq("id", str(document_id))\
                .execute()
        except:
            pass
