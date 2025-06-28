from pydantic import Field
from typing import Optional, Dict, Any, List
import uuid # For user_id who made the change

from app.models.base_model import BaseDocumentModel, PyObjectId
from app.models.person_model import PersonModel # To store the state or diff

class ChangeDetail(BaseModel):
    field: str  # Path to the changed field, e.g., "name_details.first_name"
    old_value: Optional[Any] = None
    new_value: Optional[Any] = None

class PersonHistoryModel(BaseDocumentModel):
    person_id: PyObjectId = Field(...) # The ID of the PersonModel document this history record refers to
    family_tree_id: PyObjectId = Field(...) # Denormalized for easier querying within a tree context

    changed_by_user_id: uuid.UUID = Field(...) # User who made the change
    # changed_by_user_name: Optional[str] = None # Denormalized for display, if needed

    timestamp: datetime = Field(...) # Timestamp of when the change occurred (should be same as created_at ideally)

    action_type: str # e.g., "create", "update", "delete" (though delete of person might be a soft delete)

    # How to store changes:
    # 1. Full snapshot of the PersonModel document before or after the change.
    #    Pros: Easy to reconstruct state. Cons: Can be storage-intensive.
    #    person_snapshot_before: Optional[PersonModel] = None
    #    person_snapshot_after: Optional[PersonModel] = None
    #
    # 2. Diff of changes.
    #    Pros: More storage-efficient if changes are small. Cons: Harder to reconstruct full state.
    #    changes: List[ChangeDetail] = Field(default_factory=list)
    #
    # 3. Store the new state only (snapshot_after). To get previous state, look at prior history record.
    person_data_snapshot: PersonModel = Field(...) # Stores the state of the person *after* this change

    # Optional: A brief description or reason for the change, if provided by user
    change_reason: Optional[str] = Field(None, max_length=500)

    class Config:
        # collection_name = "person_history"
        json_encoders = {
            **BaseDocumentModel.Config.json_encoders,
            # Add any specific encoders if needed
        }

from datetime import datetime # For timestamp type hint. Already in base_model.
