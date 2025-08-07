"""Pydantic schemas for genealogy_service service."""

from pydantic import BaseModel, Field, HttpUrl
from typing import List, Optional, Any
from uuid import UUID
from enum import Enum

class PrivacySetting(str, Enum):
    PUBLIC = "PUBLIC"
    FAMILY_TREE_ONLY = "FAMILY_TREE_ONLY"
    PRIVATE = "PRIVATE"

class Gender(str, Enum):
    MALE = "MALE"
    FEMALE = "FEMALE"
    OTHER = "OTHER"
    UNKNOWN = "UNKNOWN"

class PersonName(BaseModel):
    given_name: str
    surname: str
    prefix: Optional[str] = None
    suffix: Optional[str] = None
    nickname: Optional[str] = None

class PersonPrivacySettings(BaseModel):
    show_profile: PrivacySetting
    show_birth_date: PrivacySetting
    show_death_date: PrivacySetting

class Identifier(BaseModel):
    type: str
    value: str
    verification_status: str
    notes: Optional[str] = None

class Fact(BaseModel):
    type: str
    value: str
    date_string: Optional[str] = None
    place: Optional[str] = None
    description: Optional[str] = None
    citations: List[str] = []

class Person(BaseModel):
    id: UUID
    tree_ids: List[UUID]
    primary_name: PersonName
    alternate_names: List[PersonName] = []
    gender: Gender
    birth_date_string: Optional[str] = None
    birth_date_exact: Optional[str] = None
    birth_place: Optional[str] = None
    is_birth_date_estimated: Optional[bool] = False
    death_date_string: Optional[str] = None
    death_date_exact: Optional[str] = None
    death_place: Optional[str] = None
    is_death_date_estimated: Optional[bool] = False
    cause_of_death: Optional[str] = None
    is_living: bool
    identifiers: List[Identifier] = []
    biography: Optional[str] = None
    notes: Optional[str] = None
    profile_image_url: Optional[HttpUrl] = None
    profile_image_id: Optional[UUID] = None
    clan: Optional[str] = None
    tribe: Optional[str] = None
    traditional_titles: List[str] = []
    privacy_settings: Optional[PersonPrivacySettings] = None
    facts: List[Fact] = []
    potential_duplicates: List[UUID] = []
    merged_into_id: Optional[UUID] = None
    merged_from_ids: List[UUID] = []

class FamilyTreeSettings(BaseModel):
    allow_collaboration: Optional[bool] = True
    show_living_persons: Optional[bool] = True
    default_person_privacy: Optional[PrivacySetting] = PrivacySetting.FAMILY_TREE_ONLY
    theme: Optional[str] = None

class FamilyTree(BaseModel):
    id: UUID
    name: str
    description: Optional[str] = None
    owner_id: UUID
    root_person_id: UUID
    collaborators: Optional[Any] = None
    privacy: PrivacySetting
    settings: Optional[FamilyTreeSettings] = None
    statistics: Optional[Any] = None
    last_gedcom_import: Optional[str] = None
    last_gedcom_export: Optional[str] = None

class RelationshipEvent(BaseModel):
    event_type: str
    date_string: Optional[str] = None
    date_exact: Optional[str] = None
    place: Optional[str] = None
    description: Optional[str] = None
    citations: List[str] = []

class RelationshipType(str, Enum):
    SPOUSE = "SPOUSE"
    PARENT_CHILD = "PARENT_CHILD"
    SIBLING = "SIBLING"
    ADOPTIVE = "ADOPTIVE"
    STEP_PARENT_CHILD = "STEP_PARENT_CHILD"
    OTHER = "OTHER"

class SpousalStatus(str, Enum):
    MARRIED = "MARRIED"
    DIVORCED = "DIVORCED"
    WIDOWED = "WIDOWED"
    UNKNOWN = "UNKNOWN"

class Relationship(BaseModel):
    id: UUID
    tree_id: UUID
    person1_id: UUID
    person2_id: UUID
    relationship_type: RelationshipType
    parental_role_person1: Optional[str] = None
    parental_role_person2: Optional[str] = None
    spousal_status: Optional[SpousalStatus] = None
    start_date_string: Optional[str] = None
    start_date_exact: Optional[str] = None
    end_date_string: Optional[str] = None
    end_date_exact: Optional[str] = None
    place: Optional[str] = None
    notes: Optional[str] = None
    events: List[RelationshipEvent] = []

class FamilyTreeCreate(BaseModel):
    name: str
    description: Optional[str] = None
    privacy: PrivacySetting
    settings: Optional[FamilyTreeSettings] = None
    root_person_id: UUID

class PersonCreate(BaseModel):
    tree_ids: List[UUID]
    primary_name: PersonName
    gender: Gender
    birth_date_string: Optional[str] = None
    birth_date_exact: Optional[str] = None
    birth_place: Optional[str] = None
    is_birth_date_estimated: Optional[bool] = False
    death_date_string: Optional[str] = None
    death_date_exact: Optional[str] = None
    death_place: Optional[str] = None
    is_death_date_estimated: Optional[bool] = False
    cause_of_death: Optional[str] = None
    is_living: bool
    biography: Optional[str] = None
    notes: Optional[str] = None
    profile_image_id: Optional[UUID] = None
    clan: Optional[str] = None
    tribe: Optional[str] = None
    traditional_titles: List[str] = []
    privacy_settings: Optional[PersonPrivacySettings] = None
    facts: List[Fact] = []
    identifiers: List[Identifier] = []
