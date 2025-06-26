from pydantic import BaseModel, Field, EmailStr, HttpUrl, validator
from typing import Optional, List, Dict, Any
from datetime import date, datetime
import uuid

from app.models.base_model import PyObjectId
from app.models.person_model import Gender, LivingStatus, NameDetails, EventDetail, ContactInfo

# Re-define enums or sub-models for schema validation if they differ from storage models
# Or directly use them from the models if they are identical for API contracts

class NameDetailsSchema(NameDetails): # Inherit from model
    pass

class EventDetailSchema(EventDetail): # Inherit from model
    pass

class ContactInfoSchema(ContactInfo): # Inherit from model
    pass

# Base properties for Person
class PersonBaseSchema(BaseModel):
    name_details: Optional[NameDetailsSchema] = None
    gender: Optional[Gender] = None
    living_status: Optional[LivingStatus] = None
    birth: Optional[EventDetailSchema] = None
    death: Optional[EventDetailSchema] = None
    burial: Optional[EventDetailSchema] = None
    biography: Optional[str] = Field(None, max_length=10000)
    notes: Optional[str] = Field(None, max_length=5000)
    profile_image_url: Optional[HttpUrl] = None
    # profile_image_id: Optional[PyObjectId] = None # Usually not set directly by client
    contact_info: Optional[ContactInfoSchema] = None
    # full_name_searchable: Optional[str] = None # System generated

# Schema for creating a Person
class PersonCreateSchema(PersonBaseSchema):
    family_tree_id: PyObjectId = Field(...)
    # user_id is set by the system (current authenticated user)
    name_details: NameDetailsSchema = Field(default_factory=NameDetailsSchema) # Ensure it's at least an empty object

# Schema for updating a Person
class PersonUpdateSchema(PersonBaseSchema):
    # All fields are optional for update
    # family_tree_id cannot be changed once set
    pass

# Schema for Person response
class PersonResponseSchema(PersonBaseSchema):
    id: PyObjectId = Field(alias="_id")
    family_tree_id: PyObjectId
    user_id: uuid.UUID # User who created/owns the record

    name_details: NameDetailsSchema # Ensure it's always part of response
    full_name_searchable: Optional[str] = None # Display the generated full name

    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
        populate_by_name = True
        json_encoders = {
            PyObjectId: str,
            datetime: lambda dt: dt.isoformat(),
            date: lambda d: d.isoformat() if d else None,
            uuid.UUID: str,
            Gender: lambda g: g.value if g else None,
            LivingStatus: lambda ls: ls.value if ls else None,
        }
        # Pydantic v2: model_config = ConfigDict(use_enum_values=True)

# Schema for search queries related to Persons (if needed)
class PersonSearchSchema(BaseModel):
    query: Optional[str] = None
    family_tree_id: Optional[PyObjectId] = None
    gender: Optional[Gender] = None
    living_status: Optional[LivingStatus] = None
    birth_year_min: Optional[int] = None
    birth_year_max: Optional[int] = None
    # Add other relevant search fields

# Schema for linking parents or spouses (used in specific endpoints)
class LinkPersonSchema(BaseModel):
    related_person_id: PyObjectId
    relationship_type: str # e.g., "father", "mother", "spouse" - specific for simple linking
                           # More complex relationships use RelationshipCreateSchema

# Schema for person with relationships for tree view (example)
class PersonInTreeResponseSchema(PersonResponseSchema):
    # Direct parent IDs for easier tree building on frontend
    father_id: Optional[PyObjectId] = None
    mother_id: Optional[PyObjectId] = None
    # Spouse IDs with relationship type for display
    spouses: List[Dict[str, Any]] = Field(default_factory=list) # e.g., [{"person_id": PyObjectId, "relationship_type": "marriage"}]
    children: List[PyObjectId] = Field(default_factory=list)

    class Config(PersonResponseSchema.Config): # Inherit config
        pass
