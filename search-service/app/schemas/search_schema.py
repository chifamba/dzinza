from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any, Union
from datetime import date, datetime # For potential date fields in search results
import uuid # For potential UUID fields in search results

# Base item for search results (can be specialized)
class SearchResultItemBaseSchema(BaseModel):
    id: str # ID of the document from Elasticsearch (could be UUID or ObjectId as string)
    score: Optional[float] = None # Relevance score from Elasticsearch
    document_type: str # e.g., "person", "family_tree", "historical_record"

    # Common preview fields
    title: Optional[str] = None # Typically name for person/tree, title for record
    snippet: Optional[str] = None # Highlighted search snippet from ES
    # link: Optional[str] = None # Link to view the full item (e.g., in frontend)

# Specific result item for a Person
class PersonSearchResultItemSchema(SearchResultItemBaseSchema):
    document_type: str = Field(default="person")
    # Person-specific fields to display in search results
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    full_name: Optional[str] = None # Denormalized full name
    birth_date: Optional[Union[date, str]] = None # Can be exact date or approximate string
    death_date: Optional[Union[date, str]] = None
    birth_place: Optional[str] = None
    death_place: Optional[str] = None
    profile_image_url: Optional[str] = None
    family_tree_id: Optional[str] = None
    family_tree_name: Optional[str] = None # Denormalized for display

# Specific result item for a Family Tree
class FamilyTreeSearchResultItemSchema(SearchResultItemBaseSchema):
    document_type: str = Field(default="family_tree")
    # FamilyTree-specific fields
    tree_name: Optional[str] = None # Alias for title if preferred
    description_snippet: Optional[str] = None # Snippet from description
    owner_id: Optional[str] = None # UUID as string
    member_count: Optional[int] = None
    # last_updated: Optional[datetime] = None

# Union of all possible search result item types
# This allows the `items` list in SearchResponseSchema to contain different types of results.
# Pydantic will try to match based on fields, especially `document_type`.
AnySearchResultItemSchema = Union[PersonSearchResultItemSchema, FamilyTreeSearchResultItemSchema, SearchResultItemBaseSchema]


# Schema for a search query from the client
class SearchQuerySchema(BaseModel):
    query_string: str = Field(..., min_length=1, description="The main search query string.")
    # Target indices or document types (client can specify, or server defaults)
    target_types: Optional[List[str]] = Field(None, description="e.g., ['person', 'family_tree']")

    # Filters (example: by family_tree_id if searching within a specific tree)
    family_tree_id_filter: Optional[str] = None
    # Add other common filters: date ranges, location, specific fields
    # Example filter structure:
    # filters: Optional[Dict[str, Any]] = None
    # e.g., {"birth_year_range": {"gte": 1900, "lte": 1950}, "location": "London"}

    # Pagination
    page: int = Field(default=1, ge=1)
    size: int = Field(default=10, ge=1, le=100)

    # Sorting (example: by relevance or a specific field)
    # sort_by: Optional[str] = "_score" # Default to relevance
    # sort_order: Optional[str] = "desc" # "asc" or "desc"

    # For faceted search
    # requested_facets: Optional[List[str]] = None # e.g., ["gender", "birth_decade", "location_country"]

# Schema for the overall search response
class SearchResponseSchema(BaseModel):
    query_string: str # The original query string
    items: List[AnySearchResultItemSchema] = []
    total_hits: int = 0 # Total documents matching the query (can be exact or estimate)
    page: int
    size: int
    # total_pages: Optional[int] = None # Can be calculated: ceil(total_hits / size)

    # For faceted search results
    # facets: Optional[Dict[str, List[Dict[str, Any]]]] = None
    # e.g. {"gender": [{"key": "male", "doc_count": 120}, {"key": "female", "doc_count": 150}]}

    # Optional: suggestions if main query returned few results (e.g., "Did you mean...")
    # suggestions: Optional[List[str]] = None


# --- For Autocomplete/Suggestions ---
class SuggestionQuerySchema(BaseModel):
    prefix: str = Field(..., min_length=1, description="The prefix string for suggestions.")
    target_type: Optional[str] = Field(None, description="e.g., 'person_name', 'location'") # Context for suggestion
    limit: int = Field(default=5, ge=1, le=20)

class SuggestionItemSchema(BaseModel):
    text: str # The suggested completion text
    # payload: Optional[Dict[str, Any]] = None # Optional additional data with suggestion
    score: Optional[float] = None # If suggestions are scored

class SuggestionResponseSchema(BaseModel):
    query_prefix: str
    suggestions: List[SuggestionItemSchema] = []


# --- For Faceted Search (if implemented) ---
class FacetCountSchema(BaseModel):
    key: Any # The facet value (e.g., "male", "1920s")
    doc_count: int # Number of documents with this facet value

class FacetSchema(BaseModel):
    field_name: str # Name of the field the facet is for
    counts: List[FacetCountSchema] = []

class FacetedSearchResultItemSchema(SearchResultItemBaseSchema): # Can inherit from specific items too
    # Any additional fields if needed for faceted display
    pass

class FacetedSearchResponseSchema(SearchResponseSchema):
    items: List[FacetedSearchResultItemSchema] # Override with more specific item type if needed
    facets: List[FacetSchema] = []
