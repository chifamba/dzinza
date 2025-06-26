from fastapi import APIRouter, Depends, HTTPException, status, Query, Body
from elasticsearch import AsyncElasticsearch, exceptions as es_exceptions
from typing import List, Optional, Any, Dict
import uuid

from app.elasticsearch.client import get_es_client_dependency
from app.schemas import search_schema # Using search_schema directly
from app.middleware.auth_middleware import get_current_active_user_id_dependency
from app.services import search_service # Assuming a search_service module for business logic
from app.core.config import settings
from app.utils.logger import logger


CurrentUserUUIDOptional = Depends(get_current_active_user_id_dependency) # This allows optional auth

router = APIRouter()

@router.post("/", response_model=search_schema.SearchResponseSchema)
async def perform_search(
    query: search_schema.SearchQuerySchema, # Using POST to allow complex query bodies
    es_client: AsyncElasticsearch = Depends(get_es_client_dependency),
    current_user_id: Optional[uuid.UUID] = CurrentUserUUIDOptional # Auth might be optional or used for personalization
):
    """
    Performs a search across configured indices based on the query.
    """
    try:
        # Basic example: construct a multi_match query
        # A more sophisticated approach would be in a search_service.py

        # Determine target indices
        target_indices = []
        if query.target_types:
            if "person" in query.target_types: target_indices.append(settings.PERSON_INDEX_NAME)
            if "family_tree" in query.target_types: target_indices.append(settings.FAMILY_TREE_INDEX_NAME)
            # Add other types as needed
        if not target_indices: # Default to searching all configured relevant indices
            target_indices = [settings.PERSON_INDEX_NAME, settings.FAMILY_TREE_INDEX_NAME]

        # Build Elasticsearch query body
        # This is a simplified example. Real query building can be complex.
        es_query_body = {
            "query": {
                "multi_match": {
                    "query": query.query_string,
                    # Define fields based on target_indices or a general set of common fields
                    "fields": ["full_name_searchable", "first_name", "last_name", "name", "description", "biography", "notes"],
                    "fuzziness": "AUTO" # Enable fuzzy matching
                }
            },
            "from": (query.page - 1) * query.size,
            "size": query.size,
            # Add highlighting, aggregations (for facets), sorting etc. here
            # "highlight": { "fields": { "*": {} } }
        }

        # Add filters if provided (example for family_tree_id_filter)
        if query.family_tree_id_filter:
            if "bool" not in es_query_body["query"]:
                 # Wrap multi_match in a bool query to add filter
                current_query = es_query_body["query"]
                es_query_body["query"] = {"bool": {"must": [current_query]}}

            if "filter" not in es_query_body["query"]["bool"]:
                es_query_body["query"]["bool"]["filter"] = []

            es_query_body["query"]["bool"]["filter"].append({
                "term": {"family_tree_id": query.family_tree_id_filter}
            })


        logger.debug(f"Elasticsearch query for '{query.query_string}': {es_query_body} on indices {target_indices}")

        search_response = await es_client.search(
            index=",".join(target_indices), # Search across multiple indices
            body=es_query_body
        )

        hits = search_response['hits']['hits']
        total_hits = search_response['hits']['total']['value']

        items = []
        for hit in hits:
            doc_type = "unknown"
            # Determine doc_type based on index name or a field in the document
            if hit["_index"] == settings.PERSON_INDEX_NAME: doc_type = "person"
            elif hit["_index"] == settings.FAMILY_TREE_INDEX_NAME: doc_type = "family_tree"

            # Basic item schema, can be expanded or use specific schemas based on doc_type
            item_data = {
                "id": hit["_id"],
                "score": hit["_score"],
                "document_type": doc_type,
                "title": hit["_source"].get("full_name_searchable") or hit["_source"].get("name") or hit["_id"], # Example title
                # "snippet": str(hit.get("highlight", {})) # Simplified snippet
            }

            # Populate with more fields based on doc_type for richer results
            if doc_type == "person":
                item_data.update({
                    "first_name": hit["_source"].get("first_name"),
                    "last_name": hit["_source"].get("last_name"),
                    "full_name": hit["_source"].get("full_name_searchable"), # Or generate from parts
                    "birth_date": hit["_source"].get("birth_date_exact") or hit["_source"].get("birth_date_approximate"),
                    "death_date": hit["_source"].get("death_date_exact") or hit["_source"].get("death_date_approximate"),
                    "birth_place": hit["_source"].get("birth_place"),
                    "death_place": hit["_source"].get("death_place"),
                    "profile_image_url": hit["_source"].get("profile_image_url"),
                    "family_tree_id": hit["_source"].get("family_tree_id"),
                    # family_tree_name would require another lookup or denormalization
                })
                items.append(search_schema.PersonSearchResultItemSchema(**item_data))
            elif doc_type == "family_tree":
                item_data.update({
                    "tree_name": hit["_source"].get("name"),
                    "description_snippet": hit["_source"].get("description", "")[:100] + "...", # Basic snippet
                    "owner_id": hit["_source"].get("owner_id"),
                    "member_count": hit["_source"].get("member_count"),
                })
                items.append(search_schema.FamilyTreeSearchResultItemSchema(**item_data))
            else: # Fallback to base item
                items.append(search_schema.SearchResultItemBaseSchema(**item_data))


        return search_schema.SearchResponseSchema(
            query_string=query.query_string,
            items=items,
            total_hits=total_hits,
            page=query.page,
            size=query.size
        )

    except es_exceptions.NotFoundError:
        # This means one of the target indices doesn't exist
        logger.warning(f"Search failed: One or more target indices not found: {target_indices}")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Search index not found.")
    except es_exceptions.ElasticsearchException as e:
        logger.error(f"Elasticsearch error during search: {e}", exc_info=True)
        # You might want to inspect e.status_code and e.error if available
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=f"Search service error: {e.error if hasattr(e, 'error') else str(e)}")
    except Exception as e:
        logger.error(f"Unexpected error during search: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="An unexpected error occurred during search.")


@router.post("/suggest", response_model=search_schema.SuggestionResponseSchema)
async def get_search_suggestions(
    query: search_schema.SuggestionQuerySchema,
    es_client: AsyncElasticsearch = Depends(get_es_client_dependency),
    current_user_id: Optional[uuid.UUID] = CurrentUserUUIDOptional # Auth might be used for context
):
    """
    Provides search-as-you-type suggestions using Elasticsearch completion suggester.
    Requires 'full_name_suggest' field in PERSON_INDEX_MAPPINGS to be of type 'completion'.
    """
    if not query.target_type or query.target_type not in ["person_name"]: # Expand as needed
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or missing target_type for suggestions.")

    index_name = ""
    suggester_field_name = ""
    suggester_name = "default_suggester" # Name your suggester in the query

    if query.target_type == "person_name":
        index_name = settings.PERSON_INDEX_NAME
        suggester_field_name = "full_name_suggest" # This field must be mapped as 'completion' type

    if not index_name or not suggester_field_name:
         raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Suggester not configured for target type.")

    suggest_query_body = {
        "suggest": {
            suggester_name: { # Arbitrary name for this suggestion request
                "prefix": query.prefix,
                "completion": {
                    "field": suggester_field_name,
                    "size": query.limit,
                    "skip_duplicates": True,
                    # "fuzzy": {"fuzziness": "AUTO"} # Optional: add fuzziness
                }
            }
        }
    }

    try:
        logger.debug(f"Elasticsearch suggest query: {suggest_query_body} on index {index_name}")
        suggest_response = await es_client.search( # Using _search endpoint for suggest
            index=index_name,
            body=suggest_query_body,
            # suggest_mode="popular" # Example suggest_mode
        )

        suggestions = []
        options = suggest_response.get("suggest", {}).get(suggester_name, [{}])[0].get("options", [])
        for option in options:
            suggestions.append(search_schema.SuggestionItemSchema(text=option["text"], score=option.get("_score")))

        return search_schema.SuggestionResponseSchema(query_prefix=query.prefix, suggestions=suggestions)

    except es_exceptions.ElasticsearchException as e:
        logger.error(f"Elasticsearch error during suggestions: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=f"Search suggestion service error: {str(e)}")
    except Exception as e:
        logger.error(f"Unexpected error during suggestions: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="An unexpected error occurred during suggestions.")


# TODO: Endpoint for re-indexing (admin-only)
# @router.post("/admin/reindex/{index_name}", status_code=status.HTTP_202_ACCEPTED)
# async def trigger_reindex(index_name: str, admin_user: Admin = Depends(get_admin_user)):
#     # Trigger a background task (Celery) to re-fetch data from source services and re-index.
#     # This is a long-running operation.
#     # Reindexing can be done from snapshot, or by pulling fresh data.
#     # Example: reindex_task.delay(index_name)
#     return {"message": f"Re-indexing process for '{index_name}' initiated."}
