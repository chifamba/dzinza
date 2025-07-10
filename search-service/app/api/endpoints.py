"""
API endpoints for search service.
"""
from datetime import datetime, timezone
from typing import Dict, Any
import structlog
from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from fastapi.responses import RedirectResponse
from starlette_prometheus import metrics

from ..core.config import settings
from ..schemas.search import (
    SearchQuery, PersonSearchQuery, SuggestQuery,
    IndexDocumentRequest, UpdateDocumentRequest,
    SearchResponse, SuggestResponse, IndexResponse, HealthCheck
)
from ..services.elasticsearch_client import ElasticsearchClientSingleton
from ..services.analytics import AnalyticsDataStorage
from ..services.search_service import SearchService
from ..utils.auth import verify_jwt_token

logger = structlog.get_logger(__name__)

# Global service instances
es_singleton = ElasticsearchClientSingleton()
analytics_storage = AnalyticsDataStorage()

# Create router
router = APIRouter()

# Health check endpoint (no auth required)
@router.get(
    "/health",
    response_model=HealthCheck,
    tags=["System"],
    summary="Health check",
    description="Check the health of the search service and its dependencies"
)
async def health_check():
    """Health check endpoint."""
    services = {}
    
    # Check Elasticsearch
    try:
        es_client = es_singleton.get_client()
        if es_client.ping():
            services["elasticsearch"] = "healthy"
        else:
            services["elasticsearch"] = "unhealthy"
    except Exception:
        services["elasticsearch"] = "unhealthy"
    
    # Check MongoDB Analytics
    try:
        if settings.MONGODB_ANALYTICS_ENABLED and analytics_storage.client:
            await analytics_storage.client.admin.command('ping')
            services["mongodb_analytics"] = "healthy"
        else:
            services["mongodb_analytics"] = "disabled"
    except Exception:
        services["mongodb_analytics"] = "unhealthy"
    
    overall_status = "healthy" if all(
        status in ["healthy", "disabled"] for status in services.values()
    ) else "unhealthy"
    
    return HealthCheck(
        status=overall_status,
        timestamp=datetime.now(timezone.utc),
        version=settings.PROJECT_VERSION,
        services=services
    )

# API documentation endpoint
@router.get(
    "/api-docs",
    tags=["System"],
    summary="API documentation",
    description="Interactive API documentation using Swagger UI"
)
async def api_docs():
    """Redirect to Swagger UI documentation."""
    return RedirectResponse(url="/docs")

# Metrics endpoint (no auth required)
@router.get(
    "/metrics",
    tags=["System"],
    summary="Prometheus metrics",
    description="Prometheus metrics for monitoring search service performance"
)
async def metrics_endpoint(request: Request):
    """Prometheus metrics endpoint."""
    if settings.ENABLE_METRICS:
        return metrics(request)
    else:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Metrics not enabled"
        )

# Core Search APIs
@router.post(
    f"{settings.API_V1_STR}/search/",
    response_model=SearchResponse,
    tags=["Search"],
    summary="General search",
    description="Perform general search across all document types"
)
async def search_general(
    query: SearchQuery,
    user_claims: Dict[str, Any] = Depends(verify_jwt_token)
):
    """General search endpoint."""
    search_service = SearchService(es_singleton.get_client(), analytics_storage)
    return await search_service.general_search(query, user_claims)

@router.post(
    f"{settings.API_V1_STR}/search/person",
    response_model=SearchResponse,
    tags=["Search"],
    summary="Person search",
    description="Specialized search for people with genealogy-specific matching"
)
async def search_person(
    query: PersonSearchQuery,
    user_claims: Dict[str, Any] = Depends(verify_jwt_token)
):
    """Person search endpoint."""
    search_service = SearchService(es_singleton.get_client(), analytics_storage)
    return await search_service.person_search(query, user_claims)

@router.get(
    f"{settings.API_V1_STR}/search/suggest",
    response_model=SuggestResponse,
    tags=["Search"],
    summary="Search suggestions",
    description="Get type-ahead search suggestions based on partial query input"
)
async def search_suggest(
    query: str = Query(..., min_length=2, description="Query string"),
    limit: int = Query(5, ge=1, le=20, description="Maximum number of suggestions"),
    user_claims: Dict[str, Any] = Depends(verify_jwt_token)
):
    """Search suggestions endpoint."""
    suggest_query = SuggestQuery(query=query, limit=limit)
    search_service = SearchService(es_singleton.get_client(), analytics_storage)
    return await search_service.get_suggestions(suggest_query, user_claims)

# Document Management APIs
@router.post(
    f"{settings.API_V1_STR}/search/index",
    response_model=IndexResponse,
    tags=["Document Management"],
    summary="Index document",
    description="Index a new document into Elasticsearch for search"
)
async def index_document(
    document: IndexDocumentRequest,
    user_claims: Dict[str, Any] = Depends(verify_jwt_token)
):
    """Index document endpoint."""
    search_service = SearchService(es_singleton.get_client(), analytics_storage)
    return await search_service.index_document(document, user_claims)

@router.put(
    f"{settings.API_V1_STR}/search/index/{{doc_id}}",
    response_model=IndexResponse,
    tags=["Document Management"],
    summary="Update document",
    description="Update an existing indexed document"
)
async def update_document(
    doc_id: str,
    updates: UpdateDocumentRequest,
    user_claims: Dict[str, Any] = Depends(verify_jwt_token)
):
    """Update document endpoint."""
    search_service = SearchService(es_singleton.get_client(), analytics_storage)
    return await search_service.update_document(doc_id, updates, user_claims)

@router.delete(
    f"{settings.API_V1_STR}/search/index/{{doc_id}}",
    response_model=IndexResponse,
    tags=["Document Management"],
    summary="Delete document",
    description="Remove a document from the search index permanently"
)
async def delete_document(
    doc_id: str,
    user_claims: Dict[str, Any] = Depends(verify_jwt_token)
):
    """Delete document endpoint."""
    search_service = SearchService(es_singleton.get_client(), analytics_storage)
    return await search_service.delete_document(doc_id, user_claims)

# Root endpoint
@router.get("/", tags=["System"])
async def root():
    """Root endpoint."""
    return {
        "message": f"Welcome to {settings.PROJECT_NAME}",
        "version": settings.PROJECT_VERSION,
        "documentation": "/docs",
        "health": "/health"
    }
