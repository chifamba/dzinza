import uuid
from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

from app.models import MergeSuggestionStatus, MergeSuggestion as MergeSuggestionDB

# --- MergeSuggestion Schemas ---

class MergeSuggestionCreate(BaseModel):
    new_person_id: uuid.UUID = Field(description="ID of the newly added or imported person that might be a duplicate.")
    existing_person_id: uuid.UUID = Field(description="ID of the existing person in the system that is a potential match.")
    confidence: float = Field(..., ge=0, le=1, description="System-calculated confidence score for the merge suggestion (0.0 to 1.0).")
    # created_by_user_id will be set from current_user if manually created, or system flag set.
    # status defaults to 'pending' in the model.

    class Config:
        json_schema_extra = {
            "example": {
                "new_person_id": "uuid-of-new-person",
                "existing_person_id": "uuid-of-existing-person",
                "confidence": 0.92
            }
        }

class MergeSuggestionUpdate(BaseModel): # For updating status (accept/decline)
    status: MergeSuggestionStatus = Field(description="New status for the merge suggestion (accepted or declined).")
    # Optionally, add fields for notes or reasons for accept/decline

    class Config:
        json_schema_extra = {
            "example": {
                "status": "accepted"
            }
        }

class MergeSuggestionRead(MergeSuggestionDB): # Inherits from the DB model
    # You might want to add populated person details for new_person and existing_person here
    # new_person_details: Optional[PersonSummary] = None # Example, would require resolver logic
    # existing_person_details: Optional[PersonSummary] = None # Example

    class Config:
        from_attributes = True

class MergeSuggestionList(BaseModel):
    items: List[MergeSuggestionRead]
    total: int
    pending_count: Optional[int] = None # Useful for dashboards
