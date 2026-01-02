"""
Main API Router
Combines all API routers
"""

from fastapi import APIRouter

from app.api.v1 import (
    auth,
    document_intelligence,
    cases,
    examinations,
    reports,
    timeline
)

api_router = APIRouter(prefix="/api/v1")

# Unified Gemini-powered Document Intelligence
api_router.include_router(document_intelligence.router)

# Phase 3 clinical clinical routers
api_router.include_router(cases.router)
api_router.include_router(examinations.router)
api_router.include_router(reports.router)
api_router.include_router(timeline.router)
