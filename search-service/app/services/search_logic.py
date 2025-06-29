from elasticsearch import AsyncElasticsearch, exceptions as es_exceptions
from typing import List, Dict, Any, Optional
import structlog

from app.schemas.search import SearchQuery, SearchHit, SearchResponse, SearchHitSource
from app.services.elasticsearch_client import get_es_client_dependency # For type hint or direct use
# from app.core.config import settings # If specific index names are in settings

logger = structlog.get_logger(__name__)

# Example: Define index names, could also come from settings or be dynamic
PERSON_INDEX = "persons"
FAMILY_TREE_INDEX = "family_trees"
EVENT_INDEX = "events"
# Add other relevant Dzinza data indexes that will be searched

# A map to target specific indexes based on record_type filter, or search all if not specified.
# This assumes your Elasticsearch setup has these indexes.
INDEX_MAP = {
    "person": PERSON_INDEX,
    "family_tree": FAMILY_TREE_INDEX,
    "event": EVENT_INDEX,
    # "media": MEDIA_INDEX, # etc.
}
DEFAULT_INDEXES_TO_SEARCH = [PERSON_INDEX, FAMILY_TREE_INDEX, EVENT_INDEX] # Search these if no record_types specified


def build_elasticsearch_query(query_in: SearchQuery) -> Dict[str, Any]:
    """
    Builds an Elasticsearch query dictionary based on the SearchQuery input.
    This is a simplified query builder. Real-world scenarios might need more complex query DSL.
    """
    es_query: Dict[str, Any] = {
        "from": (query_in.page - 1) * query_in.size,
        "size": query_in.size,
        "query": {
            "bool": {
                "must": [],
                "filter": [] # Filters are applied in a non-scoring context
            }
        }
    }

    # Main query string (e.g., multi_match on several fields)
    if query_in.query_string and query_in.query_string != "*":
        es_query["query"]["bool"]["must"].append({
            "multi_match": {
                "query": query_in.query_string,
                # Define fields to search across. These should be common text fields.
                # This needs to be adapted based on actual indexed fields.
                "fields": ["title^3", "name^3", "description", "summary", "content", "tags^2", "*.full_name"],
                "type": "best_fields", # Or "most_fields", "cross_fields", "phrase_prefix" etc.
                "fuzziness": "AUTO" # Allow some fuzziness for typos
            }
        })
    else: # If query_string is "*" or empty, match all documents
        es_query["query"]["bool"]["must"].append({"match_all": {}})

    # Record type filtering (applied as a filter for efficiency)
    if query_in.record_types:
        # This assumes a field like 'record_type' exists in your documents
        es_query["query"]["bool"]["filter"].append({
            "terms": {"record_type.keyword": query_in.record_types} # Use .keyword for exact matches on text fields
        })

    # Specific field filters
    if query_in.filters:
        for f in query_in.filters:
            # This is a simple term filter. More complex filters (range, exists, etc.) would need more logic.
            # Assumes field names are Elasticsearch field names (e.g., 'tree_id.keyword')
            filter_field = f.field
            if not filter_field.endswith(".keyword") and isinstance(f.value, str):
                # Heuristic: if it's a string value and field doesn't end with .keyword, add it.
                # This depends on your ES mapping (text fields often have a .keyword sub-field for exact matches).
                # For non-string values or fields known not to be text, use field directly.
                # This is a simplification; robust mapping knowledge is better.
                # Example: if f.field is "status" and it's mapped as keyword, no .keyword needed.
                # if f.field is "description" (text), f.field + ".keyword" might be wrong if not mapped.
                # For now, let's assume direct field name or user provides field.keyword.
                pass # Field name as is for now.

            es_query["query"]["bool"]["filter"].append({
                "term": {filter_field: f.value}
            })

    # Sorting
    if query_in.sort_by:
        es_sort_order = query_in.sort_order if query_in.sort_order else "desc"
        # Default to _score if no sort_by is given and query_string is not match_all
        # Elasticsearch sorts by _score desc by default if there's a query that scores.
        # If it's a match_all query, ES sorts by doc order unless sort is specified.
        if query_in.sort_by == "_score" and not (query_in.query_string and query_in.query_string != "*"):
            # Cannot sort by _score if it's a filter-only or match_all query that doesn't produce scores
            pass # Let ES use default sort (doc order for match_all)
        else:
            es_query["sort"] = [{query_in.sort_by: {"order": es_sort_order}}]

    # TODO: Add highlighting configuration if query_in.highlighting_requested
    # es_query["highlight"] = { "fields": {"content": {}, "title": {}} }

    # TODO: Add aggregations for faceting if query_in.facets_requested
    # es_query["aggs"] = { "record_type_counts": { "terms": { "field": "record_type.keyword" } } }

    if query_in.request_highlighting:
        # Define fields for highlighting. These should be text fields where matches are expected.
        # This can be made more configurable, e.g., per record_type.
        highlight_fields = {
            "title": {}, # Empty object uses default settings for highlighting this field
            "name": {},
            "description": {},
            "summary": {},
            "content": {},
            "tags": {},
            "*.full_name": {} # Highlight full_name fields in nested objects
        }
        es_query["highlight"] = {
            "fields": highlight_fields,
            # Optional: configure pre_tags and post_tags if default <em> is not desired
            # "pre_tags": ["<strong>"],
            # "post_tags": ["</strong>"],
            "fragment_size": 150, # Size of the highlighted snippet
            "number_of_fragments": 3 # Number of snippets to return per field
        }

    logger.debug("Built Elasticsearch query", es_query=es_query)
    return es_query


async def execute_search(
    es_client: AsyncElasticsearch, # Pass the client instance
    query_in: SearchQuery
) -> SearchResponse:
    """
    Executes a search query against Elasticsearch and returns a formatted response.
    """
    es_dsl_query = build_elasticsearch_query(query_in)

    # Determine target indexes
    target_indexes = DEFAULT_INDEXES_TO_SEARCH
    if query_in.record_types:
        # If specific record types are requested, try to narrow down indexes
        # This is a simple approach; more sophisticated index routing might be needed.
        specific_indexes = set()
        for rt in query_in.record_types:
            if rt.lower() in INDEX_MAP:
                specific_indexes.add(INDEX_MAP[rt.lower()])
        if specific_indexes:
            target_indexes = list(specific_indexes)

    index_to_search_str = ",".join(target_indexes) # ES client takes comma-separated string or list
    logger.info(f"Executing search on indexes: {index_to_search_str}", query_string=query_in.query_string)

    try:
        es_response = await es_client.search(
            index=index_to_search_str,
            body=es_dsl_query,
            # request_timeout=settings.ELASTICSEARCH_REQUEST_TIMEOUT, # If configured
        )
    except es_exceptions.ConnectionError as e:
        logger.error("Elasticsearch connection error during search.", error=str(e), exc_info=True)
        raise HTTPException(status_code=503, detail="Search service temporarily unavailable (datastore connection).")
    except es_exceptions.NotFoundError as e: # e.g. index not found
        logger.warning(f"Elasticsearch search error: Index not found? {e.info}", error_info=e.info)
        # Return empty results if index not found, or handle as error
        return SearchResponse(query=query_in, total_hits=0, hits=[], page=query_in.page, size=query_in.size)
    except es_exceptions.ElasticsearchException as e: # Catch other ES specific errors
        logger.error(f"Elasticsearch search query failed: {e.info}", error_info=e.info, query=es_dsl_query)
        # Depending on error type (e.g. parsing error in query vs server error), status code might vary
        raise HTTPException(status_code=500, detail=f"Search query execution failed: {e.error}")


    hits_list: List[SearchHit] = []
    for hit in es_response.get("hits", {}).get("hits", []):
        source_data = hit.get("_source", {})
        # Try to get record_type from source, fallback to _index if it helps infer type
        record_type = source_data.get("record_type", hit.get("_index", "unknown"))

        hits_list.append(
            SearchHit(
                id=hit.get("_id"),
                score=hit.get("_score"),
                record_type=record_type,
                source=source_data,
                highlighted_fields=hit.get("highlight") # Add highlight results if present
            )
        )

    total_hits = es_response.get("hits", {}).get("total", {}).get("value", 0)
    # took_ms = es_response.get("took")
    # facets_data = es_response.get("aggregations") # If aggregations were requested

    return SearchResponse(
        query=query_in,
        total_hits=total_hits,
        hits=hits_list,
        page=query_in.page,
        size=query_in.size,
        # facets=facets_data,
        # took_ms=took_ms
    )

# TODO: Add function for logging search analytics to MongoDB if MONGODB_ANALYTICS_ENABLED
# async def log_search_analytic_event(db_analytics: AsyncIOMotorDatabase, event_data: SearchAnalyticsEventDB):
#     collection = db_analytics[SEARCH_ANALYTICS_COLLECTION] # Define this collection name
#     await collection.insert_one(event_data.model_dump(by_alias=True))
#     logger.info("Search analytic event logged.", query=event_data.query_string, user_id=event_data.user_id)
