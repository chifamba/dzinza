from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import date, datetime

# These are highly dependent on what kind of analytics are being tracked and reported.
# The original search-service had an `analyticsRoutes.ts`, implying some analytics capability.
# These are example schemas.

class AnalyticsEventSchema(BaseModel):
    """
    Represents a single analytics event that might be ingested.
    E.g., a search query performed, a result clicked, a profile viewed from search.
    """
    event_type: str = Field(..., description="e.g., 'search_performed', 'result_clicked', 'profile_view_from_search'")
    user_id: Optional[str] = None # UUID of the user, if authenticated
    session_id: Optional[str] = None # To track user session
    timestamp: datetime = Field(default_factory=datetime.utcnow)

    # Event-specific payload
    query_string: Optional[str] = None # For 'search_performed'
    clicked_doc_id: Optional[str] = None # For 'result_clicked'
    clicked_doc_type: Optional[str] = None
    clicked_doc_rank: Optional[int] = None # Rank in search results

    # Other context
    user_agent: Optional[str] = None
    ip_address: Optional[str] = None # Anonymized or GDPR compliant
    # custom_dimensions: Optional[Dict[str, Any]] = None

class AnalyticsQuerySchema(BaseModel):
    """
    Schema for querying analytics data.
    """
    report_name: str = Field(..., description="e.g., 'top_search_queries', 'search_click_through_rate'")
    start_date: date
    end_date: date
    filters: Optional[Dict[str, Any]] = None # e.g., {"user_segment": "new_users"}
    group_by: Optional[List[str]] = None # e.g., ["query_string", "day"]
    limit: int = Field(default=100, ge=1, le=1000)

class AnalyticsReportDataItemSchema(BaseModel):
    dimensions: Dict[str, Any] # e.g., {"query": "John Smith", "day": "2023-01-15"}
    metrics: Dict[str, Union[int, float]] # e.g., {"search_count": 150, "click_count": 20}

class AnalyticsReportSchema(BaseModel):
    """
    Schema for returning analytics report data.
    """
    report_name: str
    start_date: date
    end_date: date
    filters_applied: Optional[Dict[str, Any]] = None
    data: List[AnalyticsReportDataItemSchema] = []
    summary: Optional[Dict[str, Any]] = None # e.g., {"total_searches": 10000, "avg_ctr": 0.05}

# If search service also handles ingestion of analytics events:
class IngestAnalyticsEventsRequest(BaseModel):
    events: List[AnalyticsEventSchema]

class IngestAnalyticsEventsResponse(BaseModel):
    success_count: int
    failure_count: int
    # errors: Optional[List[Dict[str, Any]]] = None # Details of failures

from typing import Union # for AnalyticsReportDataItemSchema metrics value type hint. Added.
