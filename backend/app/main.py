"""app.main

MediCase FastAPI Application Entry Point

This file wires FastAPI + middleware + logging.

Logging goals:
- Make HTTP 422s actionable by logging *which* endpoint failed validation and
  *which* fields were missing/invalid.
- Add a per-request correlation id so frontend/backend logs can be tied together.
- Avoid leaking PHI by truncating request bodies in logs.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi import Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
from uuid import uuid4
import logging

from app.config import settings
from app.api.v1.router import api_router
from app.core.database import init_db

# Configure logging
# NOTE: Use a richer format and include request_id if present.
logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL),
    format="%(asctime)s - %(levelname)s - %(name)s - %(message)s",
)
logger = logging.getLogger(__name__)


def _truncate_bytes(data: bytes | None, limit: int = 2048) -> str:
    """Return a safe, truncated representation of request bodies.

    We *do not* want to dump large payloads or PHI into logs.
    """
    if not data:
        return ""
    try:
        text = data.decode("utf-8", errors="replace")
    except Exception:
        return f"<{len(data)} bytes>"
    if len(text) <= limit:
        return text
    return text[:limit] + f"... <truncated, {len(text)} chars total>"


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan events
    """
    # Startup
    logger.info(f"Starting {settings.APP_NAME} v{settings.APP_VERSION}")
    await init_db()
    logger.info("Database initialized")
    
    yield
    
    # Shutdown
    logger.info("Shutting down application")


# Initialize FastAPI application
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="AI-powered medico-legal assessment platform for orthopedic IMEs",
    lifespan=lifespan,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json"
)


@app.middleware("http")
async def request_id_middleware(request: Request, call_next):
    """Attach a correlation id to each request and response.

    Clients may send X-Request-ID; otherwise we generate one.
    """
    request_id = request.headers.get("x-request-id") or str(uuid4())
    request.state.request_id = request_id
    response = await call_next(request)
    response.headers["X-Request-ID"] = request_id
    return response

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    # This is the canonical source of FastAPI-generated 422s.
    request_id = getattr(request.state, "request_id", "-")
    raw_body = await request.body() if settings.LOG_VALIDATION_BODIES else b""

    logger.warning(
        "[%s] 422 RequestValidationError on %s %s (content-type=%s)",
        request_id,
        request.method,
        request.url.path,
        request.headers.get("content-type"),
    )
    # Field-level details are what we need to quickly diagnose 422s.
    logger.warning("[%s] validation_errors=%s", request_id, exc.errors())
    if settings.LOG_VALIDATION_BODIES:
        logger.debug("[%s] request_body=%s", request_id, _truncate_bytes(raw_body))

    return JSONResponse(status_code=422, content={"detail": exc.errors()})

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.get_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add security middleware
if not settings.DEBUG:
    app.add_middleware(
        TrustedHostMiddleware,
        allowed_hosts=settings.ALLOWED_HOSTS
    )

# Include API router
app.include_router(api_router, prefix="/api/v1")


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "running"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG
    )
