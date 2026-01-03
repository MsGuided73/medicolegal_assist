"""Backend smoke tests.

These are intentionally small and dependency-light so CI/dev can confirm that:
- The FastAPI app imports successfully
- Core integration routers are registered

We do NOT hit Supabase/LLM providers here.
"""

from app.main import app


def test_app_imports() -> None:
    assert app is not None


def test_openapi_has_expected_tags() -> None:
    schema = app.openapi()
    # OpenAPI "tags" metadata is only populated if FastAPI is given explicit tags metadata.
    # Our stability check should instead ensure that the integration routes are present.
    paths = schema.get("paths", {})

    assert "/api/v1/document-intelligence/analyze" in paths
    assert "/api/v1/documents" in paths
    assert "/api/v1/reports" in paths
