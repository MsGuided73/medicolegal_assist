"""app.services.document_service

Document Storage Service
------------------------
Owns the persistence boundary for uploaded documents:

1) Upload raw file bytes to Supabase Storage (private bucket: `documents`)
2) Create/update a row in the `documents` table to track metadata/status
3) Generate signed URLs for secure downloading

This service intentionally uses the **admin** Supabase client because:
- the backend already uses service role keys for server-side DB writes
- we generate signed URLs server-side

NOTE: Storage bucket/policies must exist in Supabase (see patch doc).
"""

import logging
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import List, Optional
from uuid import UUID, uuid4

from supabase import Client

from app.core.database import get_supabase_admin

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class DocumentUploadResult:
    document_row: dict
    document_id: UUID
    storage_path: str


class DocumentService:
    """Manage document storage + metadata."""

    def __init__(self, bucket_name: str = "documents"):
        self.supabase: Client = get_supabase_admin()
        self.bucket_name = bucket_name

    async def upload_document(
        self,
        *,
        file_path: str,
        file_name: str,
        case_id: UUID,
        user_id: UUID,
        file_size: int,
        mime_type: str = "application/pdf",
        document_id: Optional[UUID] = None,
    ) -> DocumentUploadResult:
        """Upload document to storage and create a DB row.

        Returns (document_row, document_id, storage_path).
        """
        # For idempotency and to support retries, callers may provide a
        # document_id. If provided, we will reuse that ID and upsert metadata.
        document_id = document_id or uuid4()
        storage_path = f"{case_id}/{document_id}/{file_name}"

        try:
            with open(file_path, "rb") as f:
                file_bytes = f.read()

            # Upload to Storage
            upload_res = self.supabase.storage.from_(self.bucket_name).upload(
                path=storage_path,
                file=file_bytes,
                file_options={"content-type": mime_type},
            )

            # supabase-py returns an APIResponse-like object (truthy), but some
            # versions return dict. So we only treat None/False as failure.
            if not upload_res:
                raise RuntimeError("Supabase Storage upload failed")

            now_iso = datetime.now(timezone.utc).isoformat()

            # Create document DB record.
            # Keep compatibility with existing schema.sql columns.
            doc_row = {
                "id": str(document_id),
                "case_id": str(case_id),
                "filename": file_name,
                "storage_path": storage_path,
                "document_type": None,
                "quality_score": None,
                "ocr_status": "pending",
                "created_at": now_iso,
                "updated_at": now_iso,
            }

            # If the patched schema (documents table from patch doc) exists, it may
            # include these additional columns. We'll attempt them optimistically.
            # If insert fails due to unknown columns, we retry with minimal payload.
            extended = {
                "file_name": file_name,
                "file_size": file_size,
                "file_path": storage_path,
                "mime_type": mime_type,
                "analysis_status": "pending",
                "uploaded_by_id": str(user_id),
            }

            try:
                # Upsert gives us idempotency: if the row already exists (same id),
                # this will update it instead of creating duplicates.
                insert_res = (
                    self.supabase.table("documents")
                    .upsert({**doc_row, **extended})
                    .execute()
                )
            except Exception as e:
                logger.warning(
                    "Documents insert with extended columns failed; retrying with base schema only. %s",
                    e,
                )
                insert_res = self.supabase.table("documents").upsert(doc_row).execute()

            if not insert_res.data:
                raise RuntimeError("Failed to create document row")

            return DocumentUploadResult(
                document_row=insert_res.data[0],
                document_id=document_id,
                storage_path=storage_path,
            )

        except Exception:
            logger.exception("Failed to upload document")
            # Best-effort rollback: remove uploaded file if it exists
            try:
                self.supabase.storage.from_(self.bucket_name).remove([storage_path])
            except Exception:
                pass
            raise

    async def update_status(
        self,
        *,
        document_id: UUID,
        status: str,
        document_type: Optional[str] = None,
        quality_score: Optional[float] = None,
    ) -> None:
        """Update analysis/ocr status.

        Supports both schemas:
        - legacy: ocr_status
        - patch: analysis_status + analyzed_at
        """
        now_iso = datetime.now(timezone.utc).isoformat()

        # Try new schema first
        update_new = {
            "analysis_status": status,
            "updated_at": now_iso,
        }
        if status == "completed":
            update_new["analyzed_at"] = now_iso
        if document_type is not None:
            update_new["document_type"] = document_type
        if quality_score is not None:
            update_new["quality_score"] = quality_score

        try:
            self.supabase.table("documents").update(update_new).eq("id", str(document_id)).execute()
            return
        except Exception:
            # Fallback to legacy
            update_old = {"ocr_status": status, "updated_at": now_iso}
            if document_type is not None:
                update_old["document_type"] = document_type
            if quality_score is not None:
                update_old["quality_score"] = quality_score

            self.supabase.table("documents").update(update_old).eq("id", str(document_id)).execute()

    async def get_case_documents(self, *, case_id: UUID) -> List[dict]:
        """Return documents for a case (newest first)."""
        try:
            res = (
                self.supabase.table("documents")
                .select("*")
                .eq("case_id", str(case_id))
                .order("created_at", desc=True)
                .execute()
            )
            return res.data or []
        except Exception:
            logger.exception("Failed to list case documents")
            return []

    async def get_signed_download_url(self, *, document_id: UUID, expires_in: int = 3600) -> Optional[str]:
        """Generate a signed URL for download."""
        try:
            res = (
                self.supabase.table("documents")
                .select("storage_path,file_path")
                .eq("id", str(document_id))
                .single()
                .execute()
            )
            if not res.data:
                return None

            path = res.data.get("file_path") or res.data.get("storage_path")
            if not path:
                return None

            signed = self.supabase.storage.from_(self.bucket_name).create_signed_url(path, expires_in=expires_in)
            # Different lib versions use signedURL / signed_url
            return signed.get("signedURL") or signed.get("signed_url")
        except Exception:
            logger.exception("Failed to create signed URL")
            return None

    async def delete_document(self, *, document_id: UUID) -> None:
        """Delete from storage and DB."""
        res = (
            self.supabase.table("documents")
            .select("storage_path,file_path")
            .eq("id", str(document_id))
            .single()
            .execute()
        )
        if not res.data:
            return

        path = res.data.get("file_path") or res.data.get("storage_path")
        if path:
            self.supabase.storage.from_(self.bucket_name).remove([path])

        self.supabase.table("documents").delete().eq("id", str(document_id)).execute()
