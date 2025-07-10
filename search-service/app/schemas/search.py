"""
Pydantic schemas for search service API requests and responses.
"""
from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class DateRange(BaseModel):
    """Date range for filtering search results."""
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None


class SearchQuery(BaseModel):
    """General search query parameters."""
    query: str = Field(..., min_length=1, description="Search query string")
    document_types: Optional[List[str]] = Field(
        None, description="Filter by document types"
    )
    privacy_levels: Optional[List[str]] = Field(
        None, description="Filter by privacy levels"
    )
    family_tree_id: Optional[str] = Field(
        None, description="Filter by family tree ID"
    )
    date_range: Optional[DateRange] = Field(
        None, description="Filter by date range"
    )
    skip: int = Field(0, ge=0, description="Number of results to skip")
    limit: int = Field(10, ge=1, le=100, description="Maximum number of results")
    sort_by: Optional[str] = Field("_score", description="Sort field")
    sort_order: Optional[str] = Field("desc", description="Sort order (asc/desc)")


class PersonSearchQuery(BaseModel):
    """Specialized search query for people."""
    first_name: Optional[str] = Field(None, description="First name to search")
    last_name: Optional[str] = Field(None, description="Last name to search")
    full_name: Optional[str] = Field(None, description="Full name to search")
    birth_date: Optional[datetime] = Field(None, description="Birth date")
    death_date: Optional[datetime] = Field(None, description="Death date")
    birth_date_range: Optional[DateRange] = Field(
        None, description="Birth date range"
    )
    death_date_range: Optional[DateRange] = Field(
        None, description="Death date range"
    )
    place_of_birth: Optional[str] = Field(None, description="Place of birth")
    place_of_death: Optional[str] = Field(None, description="Place of death")
    family_tree_id: Optional[str] = Field(None, description="Family tree ID")
    fuzzy_matching: bool = Field(True, description="Enable fuzzy matching")
    skip: int = Field(0, ge=0, description="Number of results to skip")
    limit: int = Field(10, ge=1, le=100, description="Maximum number of results")


class SuggestQuery(BaseModel):
    """Type-ahead suggestion query."""
    query: str = Field(..., min_length=2, description="Query string for suggestions")
    limit: int = Field(5, ge=1, le=20, description="Maximum number of suggestions")


class IndexDocumentRequest(BaseModel):
    """Request to index a new document."""
    title: str = Field(..., min_length=1, description="Document title")
    content: str = Field(..., min_length=1, description="Document content")
    document_type: str = Field(..., description="Document type")
    privacy_level: str = Field(..., description="Privacy level")
    family_tree_id: Optional[str] = Field(None, description="Family tree ID")
    metadata: Optional[Dict[str, Any]] = Field(
        None, description="Additional metadata"
    )


class UpdateDocumentRequest(BaseModel):
    """Request to update an existing document."""
    title: Optional[str] = Field(None, description="Document title")
    content: Optional[str] = Field(None, description="Document content")
    privacy_level: Optional[str] = Field(None, description="Privacy level")
    metadata: Optional[Dict[str, Any]] = Field(
        None, description="Additional metadata"
    )


class SearchResultItem(BaseModel):
    """Individual search result item."""
    id: str
    score: float
    document_type: str
    title: str
    content: str
    privacy_level: str
    family_tree_id: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None
    highlights: Optional[Dict[str, List[str]]] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class SearchResponse(BaseModel):
    """Search response containing results and metadata."""
    results: List[SearchResultItem]
    total: int
    page: int
    per_page: int
    total_pages: int
    query_time_ms: int
    facets: Optional[Dict[str, Any]] = None


class SuggestResponse(BaseModel):
    """Suggestion response."""
    suggestions: List[str]
    query: str
    total: int


class IndexResponse(BaseModel):
    """Response for indexing operations."""
    id: str
    status: str
    message: str


class HealthCheck(BaseModel):
    """Health check response."""
    status: str
    timestamp: datetime
    version: str
    services: Dict[str, str]


class ErrorResponse(BaseModel):
    """Error response."""
    error: str
    message: str
    details: Optional[Dict[str, Any]] = None
