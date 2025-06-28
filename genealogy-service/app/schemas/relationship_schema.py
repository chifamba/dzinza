from pydantic import BaseModel, Field, validator
from typing import Optional, List
from datetime import date, datetime
import uuid

from app.models.base_model import PyObjectId
from app.models.relationship_model import RelationshipType, RelationshipEvent

# Re-define or use model's RelationshipEvent
class RelationshipEventSchema(RelationshipEvent): # Inherit from model
    pass

# Base properties for Relationship
class RelationshipBaseSchema(BaseModel):
    relationship_type: Optional[RelationshipType] = None
    start_date_exact: Optional[date] = None
    start_date_approximate: Optional[str] = None
    end_date_exact: Optional[date] = None
    end_date_approximate: Optional[str] = None
    place_of_event: Optional[str] = Field(None, max_length=255)
    notes: Optional[str] = Field(None, max_length=2000)
    # events: Optional[List[RelationshipEventSchema]] = None

# Schema for creating a Relationship
class RelationshipCreateSchema(RelationshipBaseSchema):
    family_tree_id: PyObjectId = Field(...)
    person1_id: PyObjectId = Field(...)
    person2_id: PyObjectId = Field(...)
    relationship_type: RelationshipType = Field(...)

    @validator('person2_id')
    def persons_must_be_different(cls, v, values):
        if 'person1_id' in values and v == values['person1_id']:
            # Allow self-referential relationships if any are defined, otherwise raise error
            # For now, assuming most relationships require two different people.
            # rel_type = values.get('relationship_type')
            # if rel_type not in [SOME_ALLOWED_SELF_REF_TYPE]:
            raise ValueError('person1_id and person2_id cannot be the same.')
        return v

# Schema for updating a Relationship
class RelationshipUpdateSchema(RelationshipBaseSchema):
    # All fields are optional for update
    # person1_id, person2_id, family_tree_id are generally not updatable.
    # If a relationship needs to change fundamental parties, it's often deleted and recreated.
    pass

# Schema for Relationship response
class RelationshipResponseSchema(RelationshipBaseSchema):
    id: PyObjectId = Field(alias="_id")
    family_tree_id: PyObjectId
    person1_id: PyObjectId
    person2_id: PyObjectId
    relationship_type: RelationshipType # Ensure this is always in response

    created_at: datetime
    updated_at: datetime

    # Include person details for easier display (optional, can make response large)
    # person1_preview: Optional[Dict[str, Any]] = None # e.g. {"id": ..., "name": ...}
    # person2_preview: Optional[Dict[str, Any]] = None

    class Config:
        from_attributes = True
        populate_by_name = True
        json_encoders = {
            PyObjectId: str,
            datetime: lambda dt: dt.isoformat(),
            date: lambda d: d.isoformat() if d else None,
            uuid.UUID: str, # If any UUIDs were part of this schema
            RelationshipType: lambda rt: rt.value if rt else None,
        }
        # Pydantic v2: model_config = ConfigDict(use_enum_values=True)
