"""Debug API Router

TEMPORARY endpoints for local validation and troubleshooting.

IMPORTANT:
- Do not expose in production.
- Must use service role key for storage downloads.
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
import logging

from app.api.dependencies import get_current_user
from app.core.database import get_supabase_admin

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/debug", tags=["debug"])


class StorageDownloadRequest(BaseModel):
    bucket: str
    storage_path: str


@router.post("/storage-download")
async def debug_storage_download(
    body: StorageDownloadRequest,
    current_user: dict = Depends(get_current_user),
):
    """Download an object from Supabase Storage using service role.

    Returns byte length for existence/auth validation.
    """

    logger.info(
        "debug_storage_download: bucket=%s storage_path=%s user=%s",
        body.bucket,
        body.storage_path,
        current_user.get("id"),
    )

    supabase = get_supabase_admin()
    try:
        data = supabase.storage.from_(body.bucket).download(body.storage_path)
        if not data:
            raise HTTPException(
                status_code=404,
                detail={
                    "message": "Storage object not found",
                    "bucket": body.bucket,
                    "storage_path": body.storage_path,
                },
            )
        return {
            "ok": True,
            "bucket": body.bucket,
            "storage_path": body.storage_path,
            "byte_length": len(data),
        }
    except HTTPException:
        raise
    except Exception as e:
        msg = str(e)
        if "404" in msg or "Not Found" in msg:
            raise HTTPException(
                status_code=404,
                detail={
                    "message": "Storage object not found",
                    "bucket": body.bucket,
                    "storage_path": body.storage_path,
                    "error": msg,
                },
            )
        if "403" in msg or "Forbidden" in msg:
            raise HTTPException(
                status_code=403,
                detail={
                    "message": "Storage download forbidden",
                    "bucket": body.bucket,
                    "storage_path": body.storage_path,
                    "error": msg,
                },
            )
        raise HTTPException(
            status_code=500,
            detail={
                "message": "Storage download failed",
                "bucket": body.bucket,
                "storage_path": body.storage_path,
                "error": msg,
            },
        )

