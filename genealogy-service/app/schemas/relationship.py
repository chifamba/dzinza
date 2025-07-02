import uuid
from datetime import date
from typing import Optional, List
from pydantic import BaseModel, Field

from app.models_main import (
    RelationshipType,
    SpousalStatus,
    ParentalRole,
    RelationshipEvent,
    Relationship as RelationshipDB # DB model for Read schema
)

# --- Relationship Schemas ---

class RelationshipEventData(BaseModel): # For creating/updating events within a relationship
    event_type: str = Field(..., description="e.g., 'Marriage', 'Divorce', 'PartnershipStart'")
    date_string: Optional[str] = None
    date_exact: Optional[date] = None
    place: Optional[str] = Field(None, max_length=255)
    description: Optional[str] = Field(None, max_length=500)

    class Config:
        from_attributes = True


class RelationshipCreateData(BaseModel):
    person1_id: uuid.UUID = Field(description="ID of the first person in the relationship")
    person2_id: uuid.UUID = Field(description="ID of the second person in the relationship")
    relationship_type: RelationshipType

    # Optional attributes based on relationship_type
    parental_role_person1: Optional[ParentalRole] = Field(None, description="Role of person1 towards person2, if parent-child type like PARENT_OF or CHILD_OF")
    parental_role_person2: Optional[ParentalRole] = Field(None, description="Role of person2 towards person1, if parent-child type")
    spousal_status: Optional[SpousalStatus] = Field(None, description="Status if relationship_type is SPOUSE")

    start_date_string: Optional[str] = None
    start_date_exact: Optional[date] = None
    end_date_string: Optional[str] = None
    end_date_exact: Optional[date] = None

    place: Optional[str] = Field(None, max_length=255, description="e.g., place of marriage")
    notes: Optional[str] = Field(None, max_length=1000)

    events: Optional[List[RelationshipEventData]] = Field(default_factory=list, description="Events associated with this relationship, like marriage ceremony.")

    class Config:
        json_schema_extra = {
            "example": {
                "person1_id": "uuid-for-person1",
                "person2_id": "uuid-for-person2",
                "relationship_type": "spouse",
                "spousal_status": "Married",
                "start_date_string": "2000-01-01",
                "place": "City Hall"
            }
        }

class RelationshipUpdateData(BaseModel):
    relationship_type: Optional[RelationshipType] = None
    parental_role_person1: Optional[ParentalRole] = None
    parental_role_person2: Optional[ParentalRole] = None
    spousal_status: Optional[SpousalStatus] = None
    start_date_string: Optional[str] = None
    start_date_exact: Optional[date] = None
    end_date_string: Optional[str] = None
    end_date_exact: Optional[date] = None
    place: Optional[str] = Field(None, max_length=255)
    notes: Optional[str] = Field(None, max_length=1000)
    events: Optional[List[RelationshipEventData]] = None # Full replacement of events list

    class Config:
        json_schema_extra = {
            "example": {
                "spousal_status": "Divorced",
                "end_date_string": "2010-05-15"
            }
        }

class RelationshipRead(RelationshipDB): # Inherits from the DB model
    # Include any transformations or additional fields needed for API responses
    class Config:
        from_attributes = True

class RelationshipList(BaseModel):
    items: List[RelationshipRead]
    total: int
