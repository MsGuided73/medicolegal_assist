"""
API v1 Router
"""
from fastapi import APIRouter

api_router = APIRouter()


@api_router.get("/")
async def api_root():
    """API v1 root endpoint"""
    return {
        "message": "MediCase API v1",
        "endpoints": [
            "/auth",
            "/cases",
            "/documents",
            "/reports"
        ]
    }
