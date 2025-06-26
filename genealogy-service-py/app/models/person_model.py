from pydantic import BaseModel, Field, EmailStr, HttpUrl
from typing import Optional, List, Dict, Any
from enum import Enum
import uuid # For user_id who created/owns this person record if different from tree owner
from datetime import date, datetime # For birth_date, death_date

from app.models.base_model import BaseDocumentModel, PyObjectId

class Gender(str, Enum):
    MALE = "male"
    FEMALE = "female"
    OTHER = "other"
    UNKNOWN = "unknown"

class LivingStatus(str, Enum):
    ALIVE = "alive"
    DECEASED = "deceased"
    UNKNOWN = "unknown"

class NameDetails(BaseModel):
    first_name: Optional[str] = Field(None, max_length=100)
    middle_name: Optional[str] = Field(None, max_length=100)
    last_name: Optional[str] = Field(None, max_length=100)
    surname_at_birth: Optional[str] = Field(None, max_length=100) # Maiden name
    nickname: Optional[str] = Field(None, max_length=50)
    suffix: Optional[str] = Field(None, max_length=20) # Jr., Sr., III
    title: Optional[str] = Field(None, max_length=50) # Dr., Rev.
    full_name_override: Optional[str] = Field(None, max_length=255) # If automatic full name generation isn't enough

    def generate_full_name(self) -> str:
        if self.full_name_override:
            return self.full_name_override
        parts = [self.title, self.first_name, self.middle_name, self.last_name, self.suffix]
        return " ".join(filter(None, parts)).strip() or "Unknown"


class EventDetail(BaseModel):
    date_approximate: Optional[str] = None # e.g., "circa 1920", "Abt. 1888", "Spring 1950"
    date_exact: Optional[date] = None
    place: Optional[str] = Field(None, max_length=255)
    description: Optional[str] = Field(None, max_length=1000)
    # sources: List[PyObjectId] = Field(default_factory=list) # Link to source documents

class ContactInfo(BaseModel):
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(None, max_length=30)
    address: Optional[str] = Field(None, max_length=255)
    # social_media: Dict[str, HttpUrl] = Field(default_factory=dict)

class PersonModel(BaseDocumentModel):
    family_tree_id: PyObjectId = Field(...) # Link to the family tree this person belongs to
    user_id: uuid.UUID # ID of the user who initially added this person or has primary edit rights
                       # This could be the tree owner or a collaborator.

    name_details: NameDetails = Field(default_factory=NameDetails)
    gender: Gender = Gender.UNKNOWN
    living_status: LivingStatus = LivingStatus.UNKNOWN

    birth: Optional[EventDetail] = None
    death: Optional[EventDetail] = None
    burial: Optional[EventDetail] = None
    # Add other custom events like marriage, baptism, graduation etc. as EventDetail or specific models
    # custom_events: List[Dict[str, Any]] = Field(default_factory=list) # e.g. {"event_type": "Marriage", "details": EventDetail}

    biography: Optional[str] = Field(None, max_length=10000)
    notes: Optional[str] = Field(None, max_length=5000)

    profile_image_url: Optional[HttpUrl] = None # URL to profile image (managed by storage-service)
    profile_image_id: Optional[PyObjectId] = None # If storing media IDs from storage-service

    contact_info: Optional[ContactInfo] = None

    # For search optimization, denormalized full name
    full_name_searchable: Optional[str] = None # To be updated whenever name_details change

    # Parent and Spousal relationships are usually managed in a separate Relationship collection
    # but you might store direct parent IDs for quick tree traversal if needed (denormalization)
    # father_id: Optional[PyObjectId] = None
    # mother_id: Optional[PyObjectId] = None
    # current_spouse_ids: List[PyObjectId] = Field(default_factory=list)

    # Link to source documents or records
    # source_ids: List[PyObjectId] = Field(default_factory=list)

    # Privacy settings for this specific person (overrides tree settings if more restrictive)
    # is_private: bool = False # Example: hide details if person is living and not the user themselves

    class Config:
        # collection_name = "persons"
        # Ensure any Enums are correctly handled for storage (usually stored as their string values)
        json_encoders = {
            **BaseDocumentModel.Config.json_encoders, # inherit from base
            Gender: lambda g: g.value,
            LivingStatus: lambda ls: ls.value,
            date: lambda d: d.isoformat() if d else None,
        }
        # Pydantic v2 uses `use_enum_values = True` in model_config for enums
        # model_config = ConfigDict(use_enum_values=True)

    # Method to update the searchable full name
    def update_full_name_searchable(self):
        self.full_name_searchable = self.name_details.generate_full_name().lower()

    # Pydantic v1 validator to auto-update searchable name
    # @root_validator(pre=False, skip_on_failure=True) # Pydantic v1
    # def _update_searchable_name(cls, values):
    #     name_details_data = values.get('name_details')
    #     if name_details_data:
    #         if isinstance(name_details_data, NameDetails):
    #             name_obj = name_details_data
    #         else: # if it's a dict from input
    #             name_obj = NameDetails(**name_details_data)
    #         values['full_name_searchable'] = name_obj.generate_full_name().lower()
    #     return values

    # For Pydantic v2, you might use a computed field or a model_validator
    # @computed_field
    # @property
    # def full_name_searchable(self) -> str:
    #     return self.name_details.generate_full_name().lower()
    # This computed field approach is good for responses, but for storage, you'd set it explicitly in CRUD.


# Could also have a PersonHistoryModel to track changes to a PersonModel document.
# (This is defined in a separate file as per the plan)
