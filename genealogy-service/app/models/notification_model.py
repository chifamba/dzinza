from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from enum import Enum
import uuid # For user_id

from app.models.base_model import BaseDocumentModel, PyObjectId

class NotificationType(str, Enum):
    NEW_COLLABORATOR = "new_collaborator"
    TREE_SHARED = "tree_shared"
    MERGE_SUGGESTION_RECEIVED = "merge_suggestion_received"
    MERGE_SUGGESTION_ACCEPTED = "merge_suggestion_accepted"
    MERGE_SUGGESTION_REJECTED = "merge_suggestion_rejected"
    COMMENT_MENTION = "comment_mention" # If comments are implemented
    NEW_RELATIVE_DISCOVERED = "new_relative_discovered" # If automated discovery is implemented
    EVENT_REMINDER = "event_reminder" # e.g., birthdays, anniversaries
    SYSTEM_ANNOUNCEMENT = "system_announcement"
    INVITATION_ACCEPTED = "invitation_accepted"
    ROLE_CHANGED = "role_changed" # e.g., collaborator role in a tree changed
    CONTENT_FLAGGED = "content_flagged" # If moderation is involved
    OTHER = "other"

class NotificationModel(BaseDocumentModel):
    user_id: uuid.UUID = Field(...)  # The user who receives the notification
    notification_type: NotificationType = Field(...)

    title: Optional[str] = Field(None, max_length=255) # Can be auto-generated based on type
    message: str = Field(..., max_length=1000) # The main content of the notification

    read: bool = Field(default=False)
    read_at: Optional[datetime] = None

    # Contextual links or data related to the notification
    # e.g., link to the family tree, person profile, merge suggestion, etc.
    related_entity_type: Optional[str] = None # e.g., "family_tree", "person", "merge_suggestion"
    related_entity_id: Optional[Any] = None # Can be PyObjectId or other type of ID
    # Example: related_link: Optional[HttpUrl] = None

    # Who triggered the notification, if applicable
    actor_id: Optional[uuid.UUID] = None # User who performed the action
    actor_name: Optional[str] = None # Denormalized for quick display

    # Additional payload for rich notifications
    payload: Optional[Dict[str, Any]] = None

    class Config:
        # collection_name = "notifications"
        json_encoders = {
            **BaseDocumentModel.Config.json_encoders,
            NotificationType: lambda nt: nt.value,
        }
        # Pydantic v2: model_config = ConfigDict(use_enum_values=True)

from datetime import datetime # For read_at type hint. Already in base_model.
