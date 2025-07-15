from typing import Optional, List
from pydantic import BaseModel

from app.models_main import Notification as NotificationDB # DB model for Read schema

# --- Notification Schemas ---

# No Create schema needed if notifications are system-generated.
# If users can create some types of notifications/messages, a Create schema would be here.

class NotificationUpdate(BaseModel): # For marking as read/unread primarily
    read: Optional[bool] = None

    class Config:
        json_schema_extra = {
            "example": {
                "read": True
            }
        }

class NotificationRead(NotificationDB): # Inherits from the DB model
    class Config:
        from_attributes = True

class NotificationList(BaseModel):
    items: List[NotificationRead]
    total: int
    unread_count: Optional[int] = None # Useful to include unread count
