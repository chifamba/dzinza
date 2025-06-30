from pydantic import BaseModel, Field, HttpUrl, model_validator
from typing import List, Optional, Dict, Any, Union
import uuid
from datetime import date, datetime # Added date and datetime

# --- Search Query Schemas ---

class SearchFilter(BaseModel):
    field: str = Field(description="The field to filter on (e.g., 'record_type', 'tree_id', 'tags').")
    value: Union[str, int, bool, date] = Field(description="The value to filter by.") # `date` from datetime
    # TODO: Add 'operator' (e.g., 'equals', 'contains', 'gt', 'lt') if more complex filtering needed. Default is equals.

class SearchQuery(BaseModel):
    query_string: str = Field(default="*", description="The main search query string. '*' for all if supported.")
    record_types: Optional[List[str]] = Field(None, description="List of record types to search (e.g., 'person', 'family_tree', 'event', 'media').")
    filters: Optional[List[SearchFilter]] = Field(None, description="List of specific field filters to apply.")
    page: int = Field(default=1, ge=1, description="Page number for pagination.")
    size: int = Field(default=10, ge=1, le=100, description="Number of results per page.")
    sort_by: Optional[str] = Field(None, description="Field to sort results by (e.g., '_score', 'created_at').")
    sort_order: Optional[str] = Field(default="desc", pattern="^(asc|desc)$", description="Sort order: 'asc' or 'desc'.")
    request_highlighting: bool = Field(default=False, description="Set to true to request highlighting of search terms in results.")
    request_facets: Optional[List[str]] = Field(None, description="List of fields for which to retrieve facet counts (e.g., 'record_type.keyword', 'tags.keyword').")

    class Config:
        json_schema_extra = {
            "example": {
                "query_string": "John Doe",
                "record_types": ["person", "family_tree"],
                "filters": [{"field": "tree_id", "value": "some-tree-uuid"}],
                "page": 1,
                "size": 20
            }
        }

# --- Search Result Schemas ---

class SearchHitSource(BaseModel): # Represents the _source field of an ES hit, structure varies by record type
    # This will likely be a Union of different record types or a generic Dict
    # For now, a generic dictionary, specific services would populate this based on what they index.
    # Example common fields:
    record_type: str = Field(description="Type of the record (e.g., 'person', 'family_tree')")
    title: Optional[str] = Field(None, description="A display title for the search result.")
    summary: Optional[str] = Field(None, description="A brief summary or snippet for the result.")
    url: Optional[HttpUrl] = Field(None, description="A direct link to view the item.") # Or an internal app path
    # Other fields will be dynamic based on the record_type

    class Config:
        extra = "allow" # Allow other fields not explicitly defined

class SearchHit(BaseModel):
    id: str = Field(description="Unique ID of the search result (e.g., from Elasticsearch _id or source system ID).")
    score: Optional[float] = Field(None, description="Relevance score from Elasticsearch.")
    record_type: str = Field(description="Type of the record (e.g., 'person', 'family_tree') - often duplicated from source for convenience.")
    source: Dict[str, Any] = Field(description="The actual source data of the hit.") # Or use SearchHitSource directly
    highlighted_fields: Optional[Dict[str, List[str]]] = Field(None, description="Fields with highlighting snippets if highlighting was requested.")

    # Example of using SearchHitSource directly if preferred:
    # source: SearchHitSource

class SearchResponse(BaseModel):
    query: SearchQuery # Echo back the query for context
    total_hits: int = Field(description="Total number of matching documents found.")
    hits: List[SearchHit] = Field(description="List of search results for the current page.")
    page: int
    size: int
    total_pages: Optional[int] = None # Calculated: (total_hits + size - 1) // size
    facets: Optional[Dict[str, Dict[str, int]]] = Field(None, description="Aggregated facet counts, e.g., {'record_type.keyword': {'person': 10, 'event': 5}}.")
    took_ms: Optional[int] = Field(None, description="Time Elasticsearch took to process the query in milliseconds.")

    @model_validator(mode='after') # Pydantic v2
    def calculate_total_pages(cls, values: 'SearchResponse') -> 'SearchResponse':
        if values.total_hits is not None and values.size > 0:
            values.total_pages = (values.total_hits + values.size - 1) // values.size
        return values

# --- Analytics Schemas (if search-service logs analytics to MongoDB) ---
class SearchAnalyticsEvent(BaseModel):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, alias="_id")
    query_string: str
    record_types_searched: Optional[List[str]] = None
    filters_applied: Optional[List[SearchFilter]] = None # Or a simpler representation
    user_id: Optional[str] = None # If search is authenticated
    session_id: Optional[str] = None # For tracking user sessions
    timestamp: datetime = Field(default_factory=datetime.utcnow) # from datetime
    results_count: int
    page_viewed: int
    # clicked_result_id: Optional[str] = None # If tracking clicks
    # click_rank: Optional[int] = None        # Rank of the clicked item

    class Config:
        populate_by_name = True
        json_encoders = {
            datetime: lambda dt: dt.isoformat(),
            uuid.UUID: lambda u: str(u)
        }
        extra = "allow" # For any other analytics fields

# Need to import date, datetime from datetime for the above
# Will add imports to models.py later if these are moved there,
# or directly here if this file manages all search-related schemas.
# For now, assuming `date` and `datetime` types are implicitly available.
# Actual imports needed:
# from datetime import date, datetime
# from pydantic import model_validator # for Pydantic v2 class based validator for SearchResponse
# `HttpUrl` also needs to be imported from pydantic.
# `uuid` from uuid module.

# --- Suggestion Schemas ---

class SuggestionQuery(BaseModel):
    text: str = Field(..., min_length=2, max_length=100, description="Partial text input for suggestions.")
    limit: int = Field(default=5, ge=1, le=20, description="Maximum number of suggestions to return.")
    # record_types: Optional[List[str]] = Field(None, description="Optional: filter suggestions by record types.")

    class Config:
        json_schema_extra = {
            "example": {
                "text": "John D",
                "limit": 10
            }
        }

class SuggestionResponseItem(BaseModel):
    text: str = Field(description="The suggested completion text.")
    # These are optional, depending on what the suggestion source can provide
    record_type: Optional[str] = Field(None, description="Type of the record suggested (e.g., 'person', 'tag').")
    record_id: Optional[str] = Field(None, description="ID of the suggested record, if applicable.")
    # score: Optional[float] = Field(None, description="Confidence score for the suggestion.")

    class Config:
        json_schema_extra = {
            "example": {
                "text": "John Doe",
                "record_type": "person",
                "record_id": "uuid-of-john-doe"
            }
        }

class SuggestionResponse(BaseModel):
    query_text: str = Field(description="The original query text for which suggestions were generated.")
    suggestions: List[SuggestionResponseItem]
