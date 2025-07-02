import uuid
from datetime import datetime
from typing import Optional, List, Dict, Any # Keep Any for generic fields if needed
from pydantic import BaseModel, Field

# Import SearchFilter from schemas if it's used directly here, or redefine if model slightly differs
from app.schemas.search import SearchFilter # Assuming SearchFilter schema is suitable for DB storage

# --- Search Analytics Model (for MongoDB) ---

class SearchAnalyticsEventDB(BaseModel):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, alias="_id")
    query_string: str = Field(max_length=500) # Max length for query string
    record_types_searched: Optional[List[str]] = Field(None, max_items=20) # Limit number of types
    filters_applied: Optional[List[SearchFilter]] = Field(None, max_items=10) # Limit number of filters

    user_id: Optional[str] = Field(None, description="ID of the user who performed the search, if authenticated.")
    session_id: Optional[str] = Field(None, description="Session identifier for tracking user activity.")

    timestamp: datetime = Field(default_factory=datetime.utcnow)
    results_count: int = Field(ge=0, description="Total number of results returned for the query.")
    page_viewed: int = Field(ge=1, description="The page number of results the user viewed.")

    # Optional fields for tracking user interaction with results
    # clicked_result_id: Optional[str] = Field(None, description="ID of the search result item that was clicked.")
    # click_rank: Optional[int] = Field(None, ge=0, description="Rank/position of the clicked item in the results list.")

    # Additional metadata
    user_agent: Optional[str] = Field(None, max_length=500)
    ip_address: Optional[str] = Field(None, max_length=50) # Store hashed/anonymized if privacy is a concern
    # processing_time_ms: Optional[int] = Field(None, ge=0, description="Time taken by search service to get results from ES.")

    class Config:
        populate_by_name = True # Allows using "_id" from MongoDB and "id" in Pydantic
        json_encoders = {
            datetime: lambda dt: dt.isoformat(),
            uuid.UUID: lambda u: str(u)
        }
        # If you want to allow extra fields not defined in the model (e.g., for future analytics properties)
        # extra = "allow"
        # Or forbid them to ensure schema adherence:
        extra = "forbid"

# Note: The actual Elasticsearch index structure (mapping for persons, family trees, etc.)
# is not defined here. This service consumes those indexes. Defining those mappings
# would be part of the data ingestion pipeline or the services that own the data (e.g., genealogy-service
# might define how its data is structured in Elasticsearch).
