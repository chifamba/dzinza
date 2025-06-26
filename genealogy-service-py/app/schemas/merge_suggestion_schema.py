from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
import uuid # For user_ids
from datetime import datetime

from app.models.base_model import PyObjectId
from app.models.merge_suggestion_model import MergeSuggestionStatus, SuggestedChangeDetail

# Re-define or use model's SuggestedChangeDetail
class SuggestedChangeDetailSchema(SuggestedChangeDetail): # Inherit from model
    pass

# Base properties for MergeSuggestion
class MergeSuggestionBaseSchema(BaseModel):
    # family_tree_id, person1_id, person2_id are usually fixed after creation
    suggestion_reason: Optional[str] = Field(None, max_length=1000)
    similarity_score: Optional[float] = None
    suggested_changes: Optional[List[SuggestedChangeDetailSchema]] = None
    # status: Optional[MergeSuggestionStatus] = None # Handled by update schema
    # suggester_type: Optional[str] = None # System set
    # suggester_user_id: Optional[uuid.UUID] = None # System set if user-initiated suggestion
    reviewer_notes: Optional[str] = Field(None, max_length=1000)

# Schema for creating a MergeSuggestion (can be system or user initiated)
class MergeSuggestionCreateSchema(MergeSuggestionBaseSchema):
    family_tree_id: PyObjectId
    person1_id: PyObjectId
    person2_id: PyObjectId
    # suggester_type and suggester_user_id (if applicable) will be set by system

# Schema for updating a MergeSuggestion (e.g., changing status, adding review notes)
class MergeSuggestionUpdateSchema(BaseModel):
    status: Optional[MergeSuggestionStatus] = None
    reviewer_notes: Optional[str] = Field(None, max_length=1000)
    # If status is 'accepted', merged_person_id and archived_person_id might be set by the system.
    # suggested_changes might be updatable during review phase before accepting/rejecting.
    suggested_changes: Optional[List[SuggestedChangeDetailSchema]] = None


# Schema for MergeSuggestion response
class MergeSuggestionResponseSchema(MergeSuggestionBaseSchema):
    id: PyObjectId = Field(alias="_id")
    family_tree_id: PyObjectId
    person1_id: PyObjectId
    person1_name_preview: Optional[str] = None
    person2_id: PyObjectId
    person2_name_preview: Optional[str] = None

    status: MergeSuggestionStatus
    suggester_type: str
    suggester_user_id: Optional[uuid.UUID] = None

    reviewer_user_id: Optional[uuid.UUID] = None
    reviewed_at: Optional[datetime] = None

    merged_person_id: Optional[PyObjectId] = None
    archived_person_id: Optional[PyObjectId] = None

    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
        populate_by_name = True
        json_encoders = {
            PyObjectId: str,
            datetime: lambda dt: dt.isoformat(),
            uuid.UUID: str,
            MergeSuggestionStatus: lambda mss: mss.value if mss else None,
        }
        # Pydantic v2: model_config = ConfigDict(use_enum_values=True)
