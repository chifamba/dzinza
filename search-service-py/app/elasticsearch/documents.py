from pydantic import BaseModel, Field
from typing import Optional, List, Any
from datetime import date, datetime
import uuid

# These models define the structure of documents as they are stored in Elasticsearch.
# They can be similar to your database models or API response schemas,
# but tailored for search (e.g., specific fields for analyzers, completion suggesters).

class ESDocumentBase(BaseModel):
    # Common fields if any, or just a marker base class
    pass

class ESPersonDocument(ESDocumentBase):
    # Fields that directly map to PERSON_INDEX_MAPPINGS
    id: str  # MongoDB ObjectId as string
    family_tree_id: str
    user_id: str # UUID as string

    first_name: Optional[str] = None
    middle_name: Optional[str] = None
    last_name: Optional[str] = None
    surname_at_birth: Optional[str] = None
    nickname: Optional[str] = None
    full_name_searchable: Optional[str] = None # This is crucial for text search
    full_name_suggest: Optional[Any] = None # For ES completion suggester (can be string or object)

    gender: Optional[str] = None # Keyword, so store as string value of enum
    living_status: Optional[str] = None # Keyword

    birth_date_exact: Optional[date] = None
    birth_date_approximate: Optional[str] = None
    birth_place: Optional[str] = None

    death_date_exact: Optional[date] = None
    death_date_approximate: Optional[str] = None
    death_place: Optional[str] = None

    biography: Optional[str] = None
    notes: Optional[str] = None

    profile_image_url: Optional[str] = None # Typically not indexed for search

    created_at: datetime
    updated_at: datetime

    # Optional: Denormalized data for better searchability
    # parent_ids: List[str] = Field(default_factory=list)
    # spouse_ids: List[str] = Field(default_factory=list)
    # children_ids: List[str] = Field(default_factory=list)
    # tag_keywords: List[str] = Field(default_factory=list) # For faceted search

    class Config:
        from_attributes = True # If creating from other Pydantic models
        # Ensure date/datetime are serialized correctly for ES if not handled by client
        json_encoders = {
            datetime: lambda dt: dt.isoformat(),
            date: lambda d: d.isoformat() if d else None,
            uuid.UUID: str, # If any UUID fields are directly part of this model
        }


class ESFamilyTreeDocument(ESDocumentBase):
    id: str # MongoDB ObjectId
    owner_id: str # UUID
    name: str
    description: Optional[str] = None
    collaborator_ids: List[str] = Field(default_factory=list) # List of UUIDs
    visibility: Optional[str] = None # e.g., "private", "public"
    member_count: Optional[int] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
        json_encoders = {
            datetime: lambda dt: dt.isoformat(),
            uuid.UUID: str,
        }

# Helper function to transform a PersonModel (from genealogy-service DB)
# into an ESPersonDocument for indexing.
# This would live in indexing_service.py or a shared utils module.
# from app.models.person_model import PersonModel # Assuming this is the source model
# def transform_person_for_es(person_db: PersonModel) -> ESPersonDocument:
#     name_suggest_input = []
#     if person_db.name_details.first_name: name_suggest_input.append(person_db.name_details.first_name)
#     if person_db.name_details.last_name: name_suggest_input.append(person_db.name_details.last_name)
#     if person_db.name_details.nickname: name_suggest_input.append(person_db.name_details.nickname)
#     full_name = person_db.name_details.generate_full_name()

#     return ESPersonDocument(
#         id=str(person_db.id),
#         family_tree_id=str(person_db.family_tree_id),
#         user_id=str(person_db.user_id),
#         first_name=person_db.name_details.first_name,
#         last_name=person_db.name_details.last_name,
#         middle_name=person_db.name_details.middle_name,
#         surname_at_birth=person_db.name_details.surname_at_birth,
#         nickname=person_db.name_details.nickname,
#         full_name_searchable=full_name.lower(), # Already handled in PersonModel itself
#         full_name_suggest={"input": list(set(name_suggest_input))}, # Input for completion suggester
#         gender=person_db.gender.value if person_db.gender else None,
#         living_status=person_db.living_status.value if person_db.living_status else None,
#         birth_date_exact=person_db.birth.date_exact if person_db.birth else None,
#         # ... and so on for all fields ...
#         created_at=person_db.created_at,
#         updated_at=person_db.updated_at,
#     )

# Similar transformer for FamilyTreeModel would be needed.
