from fastapi import APIRouter, Depends, HTTPException, Body, Request, status # Added status
from elasticsearch import AsyncElasticsearch
from motor.motor_asyncio import AsyncIOMotorDatabase # For analytics DB type hint
from typing import Optional

from app import schemas
from app.services import search_logic
from app.services.elasticsearch_client import get_es_client_dependency
# Assuming a way to get optional current user, and optional analytics_db
# from app.dependencies import get_current_user_optional
from app.dependencies import AuthenticatedUser # Using this for now, will make it optional if needed
from app.dependencies import get_current_active_user # For now, assume search might be auth-dependent

from app.core.config import settings # For MONGODB_ANALYTICS_ENABLED check
from app.db.analytics_db import get_analytics_db_dependency # If logging analytics
from app.analytics_models import SearchAnalyticsEventDB # If logging analytics
from app.crud import crud_search_analytics # If logging analytics

router = APIRouter()

# Placeholder for an optional current_user dependency
# This would typically involve a modified version of get_current_active_user
# that doesn't raise an exception if the token is missing or invalid, but returns None.
# For now, we can make the dependency itself optional in the endpoint signature.
async def get_current_user_optional(request: Request) -> Optional[AuthenticatedUser]:
    try:
        # This reuses the existing dependency that would raise HTTPException on failure.
        # A true "optional" auth dependency would catch that HTTPException and return None.
        # This is a simplified stub.
        # For a real optional auth:
        # auth_header = request.headers.get("Authorization")
        # if auth_header:
        #     try:
        #         # ... (full token validation logic from AuthMiddleware) ...
        #         # return AuthenticatedUserState(...)
        #     except HTTPException: # Specifically catch auth-related HTTPExceptions
        #         return None
        # return None
        # For now, let's just use the strict one and comment out user_id logging if no user.
        return await get_current_active_user(request=request) # Assuming get_current_active_user can take request
    except HTTPException as e:
        if e.status_code == status.HTTP_401_UNAUTHORIZED or e.status_code == status.HTTP_403_FORBIDDEN : # Or whatever your auth dep raises
            return None # Treat auth errors as anonymous user
        raise # Re-raise other HTTPExceptions


@router.post("/", response_model=schemas.search.SearchResponse)
async def perform_search(
    *,
    request: Request, # To get headers like User-Agent, and client IP
    search_query: schemas.search.SearchQuery = Body(...),
    es_client: AsyncElasticsearch = Depends(get_es_client_dependency),
    current_user: Optional[AuthenticatedUser] = Depends(get_current_user_optional), # Made user optional
    analytics_db: Optional[AsyncIOMotorDatabase] = Depends(get_analytics_db_dependency) # Analytics DB
):
    """
    Perform a search across indexed Dzinza records.

    The query body can include:
    - `query_string`: The text to search for.
    - `record_types`: Optional list of types to filter by (e.g., "person", "family_tree").
    - `filters`: Optional list of field-specific filters.
    - `page`, `size`: For pagination.
    - `sort_by`, `sort_order`: For sorting results.
    """
    # TODO: Implement user-contextual search if current_user is available
    # e.g., add filters based on user's access rights to trees, persons, etc.
    # This would involve modifying search_query.filters before passing to search_logic.
    # if current_user:
    #     # Example: add a filter that user must be owner or collaborator for certain record types
    #     pass

    search_response = await search_logic.execute_search(es_client=es_client, query_in=search_query)

    if settings.MONGODB_ANALYTICS_ENABLED and analytics_db:
        try:
            # Prepare filters for logging: convert SearchFilter objects to dicts or simple strings
            filters_to_log = None
            if search_query.filters:
                filters_to_log = [f.model_dump() for f in search_query.filters]

            analytics_event_data = SearchAnalyticsEventDB(
                query_string=search_query.query_string,
                record_types_searched=search_query.record_types,
                filters_applied=filters_to_log, # Log the dict representation
                user_id=current_user.id if current_user else None,
                # session_id= # Requires session middleware or client-sent ID
                results_count=search_response.total_hits,
                page_viewed=search_query.page,
                user_agent=request.headers.get("user-agent"),
                ip_address=request.client.host if request.client else None
            )
            await crud_search_analytics.log_search_event(db=analytics_db, event_data=analytics_event_data)
        except Exception as e:
            # Log error but don't fail the search response
            # Use the logger from search_logic or define one in this file
            search_logic.logger.error(f"Failed to log search analytics: {e}", exc_info=True)

    return search_response

@router.get("/suggest", response_model=schemas.search.SuggestionResponse)
async def get_search_suggestions(
    *,
    # Use SuggestionQuery as a dependency to get query parameters
    query_params: schemas.search.SuggestionQuery = Depends(), # Gets 'text' and 'limit' from query params
    es_client: AsyncElasticsearch = Depends(get_es_client_dependency),
    # current_user: Optional[AuthenticatedUser] = Depends(get_current_user_optional) # Optional auth
):
    """
    Provides search suggestions (type-ahead) based on the input text.
    """
    # TODO: Potentially filter suggestions based on user permissions if current_user is available
    # This would require passing user context to search_logic.get_suggestions
    # and modifying that function to incorporate such filters in its ES query.

    suggestion_items = await search_logic.get_suggestions(
        es_client=es_client,
        query_text=query_params.text,
        limit=query_params.limit
        # record_types=query_params.record_types # If SuggestionQuery includes record_types
    )

    return schemas.search.SuggestionResponse(
        query_text=query_params.text,
        suggestions=suggestion_items
    )

# TODO: Add specific endpoints if needed, e.g., GET /search/persons?q=...
# These would construct a SearchQuery internally and call execute_search.
# For now, a single POST endpoint provides flexibility.
