from elasticsearch import AsyncElasticsearch, exceptions as es_exceptions
from typing import List, Dict, Any, Optional
import structlog

from app import schemas # Import the schemas module
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

    if query_in.request_facets:
        es_query["aggs"] = {}
        for facet_field in query_in.request_facets:
            # Assuming facet_field is something like "record_type.keyword" or "tags.keyword"
            # The size parameter determines how many unique terms (buckets) to return for the facet.
            es_query["aggs"][facet_field.replace(".keyword", "_counts")] = { # Use a descriptive name for the agg result
                "terms": {"field": facet_field, "size": 20} # Return top 20 facet values
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
    took_ms = es_response.get("took")

    facets_data: Optional[Dict[str, Dict[str, int]]] = None
    if query_in.request_facets and "aggregations" in es_response:
        facets_data = {}
        for agg_name, agg_result in es_response["aggregations"].items():
            # agg_name here would be like "record_type_counts"
            # The original field name (e.g. "record_type.keyword") can be part of agg_name or inferred
            # For simplicity, let's assume the client knows what original field `agg_name` refers to,
            # or we store metadata about requested facets.
            # Here, we'll use the agg_name as the key in our response.
            # A more robust way might be to map agg_name back to the original requested facet field.
            original_facet_field_name = agg_name.replace("_counts", ".keyword") # Simple heuristic to get original field
            facets_data[original_facet_field_name] = {
                bucket["key"]: bucket["doc_count"] for bucket in agg_result.get("buckets", [])
            }

    return SearchResponse(
        query=query_in,
        total_hits=total_hits,
        hits=hits_list,
        page=query_in.page,
        size=query_in.size,
        facets=facets_data,
        took_ms=took_ms
    )

# TODO: Add function for logging search analytics to MongoDB if MONGODB_ANALYTICS_ENABLED
# async def log_search_analytic_event(db_analytics: AsyncIOMotorDatabase, event_data: SearchAnalyticsEventDB):
#     collection = db_analytics[SEARCH_ANALYTICS_COLLECTION] # Define this collection name
#     await collection.insert_one(event_data.model_dump(by_alias=True))
#     logger.info("Search analytic event logged.", query=event_data.query_string, user_id=event_data.user_id)


async def get_suggestions(
    es_client: AsyncElasticsearch,
    query_text: str,
    limit: int = 5,
    record_types: Optional[List[str]] = None # Optional: filter suggestions by record type
) -> List[schemas.search.SuggestionResponseItem]: # Ensure schemas is imported or use full path
    """
    Provides search suggestions based on query_text using match_phrase_prefix.
    This is a basic implementation. For more advanced suggestions, consider
    Elasticsearch's Completion Suggester or search_as_you_type field mappings.
    """
    if not query_text or len(query_text) < 2: # Min length for suggestions
        return []

    # Define fields to search for suggestions (prioritize names, titles)
    # These fields should ideally be mapped in a way that supports prefix queries well.
    # Using .keyword for exact prefix matching on parts of text fields might be too restrictive.
    # Text fields analyzed with edge_ngram or similar are better for this.
    # For now, we'll use standard text fields and rely on match_phrase_prefix.
    suggestion_fields = ["title", "name", "*.full_name", "summary", "description", "tags"]

    es_query_body = {
        "query": {
            "multi_match": {
                "query": query_text,
                "type": "phrase_prefix",
                "fields": suggestion_fields
            }
        },
        "size": limit, # Limit number of documents to fetch for suggestions
        "_source": ["title", "name", "record_type"] # Fetch only necessary fields for suggestion text
                                                 # and potentially record_type/id for linking
    }

    # Add record_type filter if provided
    if record_types:
        es_query_body["query"] = {
            "bool": {
                "must": [es_query_body["query"]],
                "filter": [{"terms": {"record_type.keyword": record_types}}]
            }
        }

    target_indexes_str = ",".join(DEFAULT_INDEXES_TO_SEARCH) # Search across default indexes for suggestions
    if record_types: # If specific record types provided, try to narrow indexes
        specific_indexes = {INDEX_MAP[rt.lower()] for rt in record_types if rt.lower() in INDEX_MAP}
        if specific_indexes:
            target_indexes_str = ",".join(list(specific_indexes))

    logger.debug("Executing suggestion query", es_query=es_query_body, indexes=target_indexes_str)

    try:
        es_response = await es_client.search(
            index=target_indexes_str,
            body=es_query_body
        )
    except es_exceptions.ElasticsearchException as e:
        logger.error(f"Elasticsearch suggestion query failed: {e.info}", error_info=e.info, query=es_query_body)
        return [] # Return empty list on error

    suggestions: List[schemas.search.SuggestionResponseItem] = []
    seen_texts = set() # To avoid duplicate suggestion texts if multiple docs yield same primary text

    for hit in es_response.get("hits", {}).get("hits", []):
        source = hit.get("_source", {})
        # Construct suggestion text: prioritize title, then name, then a snippet.
        # This needs to be adapted based on common fields in your indexed documents.
        text = source.get("title", source.get("name"))
        if isinstance(text, dict) and "full_name" in text : # Handle PersonName like structures
            text = text.get("full_name")

        if not text and "summary" in source: # Fallback to summary
            text = source["summary"]
        elif not text and "description" in source: # Fallback to description
            text = source["description"]

        if not text or not isinstance(text, str): # Ensure text is a string
            continue

        text = text[:100] # Truncate long suggestions

        if text.lower() not in seen_texts: # Basic deduplication
            suggestions.append(schemas.search.SuggestionResponseItem(
                text=text,
                record_type=source.get("record_type"),
                record_id=hit.get("_id")
            ))
            seen_texts.add(text.lower())

        if len(suggestions) >= limit:
            break

    return suggestions
