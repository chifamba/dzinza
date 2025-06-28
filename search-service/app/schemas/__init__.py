from .search_schema import (
    SearchQuerySchema,
    SearchResultItemSchema,
    SearchResponseSchema,
    SuggestionQuerySchema,
    SuggestionResponseSchema,
    FacetedSearchResultItemSchema, # If doing faceted search
    FacetedSearchResponseSchema,   # If doing faceted search
)
from .analytics_schema import (
    AnalyticsQuerySchema, # Example
    AnalyticsReportSchema,  # Example
)

# Base response for pagination if needed (can be shared)
from pydantic import BaseModel
from typing import List, TypeVar, Generic, Optional

T = TypeVar('T')

class PaginatedResponse(BaseModel, Generic[T]):
    items: List[T]
    total: int
    page: int
    size: int
    # pages: Optional[int] = None # Calculated (total / size)
