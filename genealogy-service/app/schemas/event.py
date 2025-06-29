import uuid
from datetime import date
from typing import Optional, List
from pydantic import BaseModel, Field

from app.models import EventType, Event as EventDB # DB model for Read schema

# --- Event Schemas ---

class EventCreateData(BaseModel): # Data for creating an event, tree_id usually from path
    primary_person_id: Optional[uuid.UUID] = None
    secondary_person_id: Optional[uuid.UUID] = None
    relationship_id: Optional[uuid.UUID] = None # Link to a relationship if this event is about it

    event_type: EventType
    custom_event_type_name: Optional[str] = Field(None, description="Name if event_type is 'custom'")

    date_string: Optional[str] = None
    date_exact: Optional[date] = None
    place_name: Optional[str] = Field(None, max_length=255)
    description: Optional[str] = Field(None, max_length=1000)
    notes: Optional[str] = Field(None, max_length=1000)

    # media_ids: Optional[List[uuid.UUID]] = Field(default_factory=list)
    # source_ids: Optional[List[uuid.UUID]] = Field(default_factory=list)

    class Config:
        json_schema_extra = {
            "example": {
                "primary_person_id": "person-uuid-john",
                "event_type": "birth",
                "date_string": "1950-03-15",
                "place_name": "New York, USA",
                "description": "Born at St. Mary's Hospital."
            }
        }

class EventUpdateData(BaseModel):
    primary_person_id: Optional[uuid.UUID] = None
    secondary_person_id: Optional[uuid.UUID] = None
    relationship_id: Optional[uuid.UUID] = None

    event_type: Optional[EventType] = None
    custom_event_type_name: Optional[str] = Field(None, description="Name if event_type is 'custom'")

    date_string: Optional[str] = None
    date_exact: Optional[date] = None
    place_name: Optional[str] = Field(None, max_length=255)
    description: Optional[str] = Field(None, max_length=1000)
    notes: Optional[str] = Field(None, max_length=1000)

    # media_ids: Optional[List[uuid.UUID]] = None # Full replacement
    # source_ids: Optional[List[uuid.UUID]] = None

    class Config:
        json_schema_extra = {
            "example": {
                "description": "Updated event description."
            }
        }

class EventRead(EventDB): # Inherits from the DB model
    class Config:
        from_attributes = True

class EventList(BaseModel):
    items: List[EventRead]
    total: int
