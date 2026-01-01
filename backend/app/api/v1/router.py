"""
API v1 Router
"""
from fastapi import APIRouter
from app.api.v1 import document_intelligence

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
            "/reports",
            "/document-intelligence"
        ]
    }

# Include routers
api_router.include_router(document_intelligence.router)
