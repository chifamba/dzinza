from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
import uuid # For user_id, actor_id
from datetime import datetime

from app.models.base_model import PyObjectId
from app.models.notification_model import NotificationType

# Base properties for Notification
class NotificationBaseSchema(BaseModel):
    # user_id is usually set by the system based on recipient
    # notification_type is usually set by the system
    title: Optional[str] = Field(None, max_length=255)
    message: Optional[str] = Field(None, max_length=1000)
    # read: Optional[bool] = None # Handled by update schema
    related_entity_type: Optional[str] = None
    related_entity_id: Optional[Any] = None # Could be PyObjectId or other ID types
    # actor_id: Optional[uuid.UUID] = None # System set
    # actor_name: Optional[str] = None # System set
    payload: Optional[Dict[str, Any]] = None


# Schema for creating a Notification (usually system-generated, not direct API input for creation by client)
class NotificationCreateSchema(NotificationBaseSchema):
    user_id: uuid.UUID
    notification_type: NotificationType
    message: str = Field(..., max_length=1000) # Message is required for creation

# Schema for updating a Notification (e.g., marking as read/unread)
class NotificationUpdateSchema(BaseModel):
    read: Optional[bool] = None
    # Potentially other fields if notifications can be modified by user

# Schema for Notification response
class NotificationResponseSchema(NotificationBaseSchema):
    id: PyObjectId = Field(alias="_id")
    user_id: uuid.UUID
    notification_type: NotificationType
    title: Optional[str] # Ensure these are part of response
    message: str
    read: bool
    read_at: Optional[datetime] = None
    actor_id: Optional[uuid.UUID] = None
    actor_name: Optional[str] = None

    created_at: datetime
    updated_at: datetime # Though notifications might not be updated often beyond 'read' status

    class Config:
        from_attributes = True
        populate_by_name = True
        json_encoders = {
            PyObjectId: str,
            datetime: lambda dt: dt.isoformat(),
            uuid.UUID: str,
            NotificationType: lambda nt: nt.value if nt else None,
        }
        # Pydantic v2: model_config = ConfigDict(use_enum_values=True)

class MarkNotificationsReadSchema(BaseModel):
    notification_ids: Optional[List[PyObjectId]] = None # Mark specific notifications
    mark_all_as_read: bool = False # Option to mark all unread as read

    @validator('notification_ids', always=True)
    def check_ids_or_all(cls, v, values):
        if not values.get('mark_all_as_read') and not v:
            raise ValueError('Either notification_ids or mark_all_as_read must be provided/true')
        if values.get('mark_all_as_read') and v:
            # Or decide on precedence, e.g., ignore ids if mark_all_as_read is true
            raise ValueError('Provide either notification_ids or set mark_all_as_read, not both')
        return v
