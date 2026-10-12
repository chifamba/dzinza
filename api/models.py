"""Dzinza v2 data models.

Ported from the original services/genealogy_service/schemas.py, with two additions
for research use:
  - Source: first-class entity (was: free-text citation strings)
  - Fact.confidence: optional attested / single_source / inferred label.
    Deliberately optional and non-nagging — facts without sources are fine.
"""

from enum import Enum
from typing import List, Optional
from uuid import UUID, uuid4

from pydantic import BaseModel, Field, HttpUrl


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------

class PrivacySetting(str, Enum):
    PUBLIC = "PUBLIC"
    FAMILY_TREE_ONLY = "FAMILY_TREE_ONLY"
    PRIVATE = "PRIVATE"


class Gender(str, Enum):
    MALE = "MALE"
    FEMALE = "FEMALE"
    OTHER = "OTHER"
    UNKNOWN = "UNKNOWN"


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


class Confidence(str, Enum):
    """How strongly a fact is supported. Optional everywhere — no nagging."""
    ATTESTED = "attested"          # multiple independent sources agree
    SINGLE_SOURCE = "single_source"  # one source only
    INFERRED = "inferred"          # deduced, not directly stated


class SourceType(str, Enum):
    ORAL_TESTIMONY = "oral_testimony"
    DOCUMENT = "document"
    BOOK = "book"
    ARCHIVE = "archive"
    WEBSITE = "website"
    OTHER = "other"


# ---------------------------------------------------------------------------
# Sources (NEW in v2 — first-class entity)
# ---------------------------------------------------------------------------

class Source(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    tree_id: UUID
    title: str = Field(..., description="e.g. 'Interview with Gogo, 2024-03-15'")
    type: SourceType = SourceType.OTHER
    teller: Optional[str] = Field(None, description="Who said it, for oral testimony")
    date_recorded: Optional[str] = None
    reference: Optional[str] = Field(None, description="Archive ref, page number, URL")
    file_id: Optional[UUID] = None  # linked media
    notes: Optional[str] = None


class SourceCreate(BaseModel):
    title: str
    type: SourceType = SourceType.OTHER
    teller: Optional[str] = None
    date_recorded: Optional[str] = None
    reference: Optional[str] = None
    file_id: Optional[UUID] = None
    notes: Optional[str] = None


# ---------------------------------------------------------------------------
# Names, identifiers, facts
# ---------------------------------------------------------------------------

class PersonName(BaseModel):
    given_name: str
    surname: str
    prefix: Optional[str] = None
    suffix: Optional[str] = None
    nickname: Optional[str] = None
    # alternate_names on Person covers praise names (e.g. Madyirapazhe), aliases


class Identifier(BaseModel):
    type: str
    value: str
    verification_status: str = "unverified"
    notes: Optional[str] = None


class Fact(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    type: str
    value: str
    date_string: Optional[str] = None
    place: Optional[str] = None
    description: Optional[str] = None
    confidence: Optional[Confidence] = Field(
        None, description="Optional. Unset means unjudged — that's fine."
    )
    source_ids: List[UUID] = Field(default_factory=list)
    # Backwards-compat with v1 free-text citations:
    citations: List[str] = Field(default_factory=list)


class PersonPrivacySettings(BaseModel):
    show_profile: PrivacySetting = PrivacySetting.FAMILY_TREE_ONLY
    show_birth_date: PrivacySetting = PrivacySetting.FAMILY_TREE_ONLY
    show_death_date: PrivacySetting = PrivacySetting.FAMILY_TREE_ONLY


class HistoricalRecord(BaseModel):
    title: str
    record_type: Optional[str] = None
    url: Optional[HttpUrl] = None
    date: Optional[str] = None
    description: Optional[str] = None
    file_id: Optional[UUID] = None


class DNAData(BaseModel):
    provider: Optional[str] = None
    test_date: Optional[str] = None
    raw_data_url: Optional[HttpUrl] = None
    match_summary: Optional[str] = None
    notes: Optional[str] = None


# ---------------------------------------------------------------------------
# Person
# ---------------------------------------------------------------------------

class Person(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    tree_ids: List[UUID] = Field(default_factory=list)
    primary_name: PersonName
    alternate_names: List[PersonName] = Field(default_factory=list)
    gender: Gender = Gender.UNKNOWN
    birth_date_string: Optional[str] = None   # free text: "early 1900s"
    birth_date_exact: Optional[str] = None    # ISO date when known
    birth_place: Optional[str] = None
    is_birth_date_estimated: bool = False
    death_date_string: Optional[str] = None
    death_date_exact: Optional[str] = None
    death_place: Optional[str] = None
    is_death_date_estimated: bool = False
    cause_of_death: Optional[str] = None
    is_living: bool = True
    identifiers: List[Identifier] = Field(default_factory=list)
    biography: Optional[str] = None
    notes: Optional[str] = None
    profile_image_id: Optional[UUID] = None
    clan: Optional[str] = None
    tribe: Optional[str] = None
    traditional_titles: List[str] = Field(default_factory=list)
    privacy_settings: Optional[PersonPrivacySettings] = None
    facts: List[Fact] = Field(default_factory=list)
    historical_records: List[HistoricalRecord] = Field(default_factory=list)
    dna_data: Optional[DNAData] = None
    # Merge lineage (trust/dedup deferred, but keep the fields)
    potential_duplicates: List[UUID] = Field(default_factory=list)
    merged_into_id: Optional[UUID] = None
    merged_from_ids: List[UUID] = Field(default_factory=list)


class PersonCreate(BaseModel):
    primary_name: PersonName
    alternate_names: List[PersonName] = Field(default_factory=list)
    gender: Gender = Gender.UNKNOWN
    birth_date_string: Optional[str] = None
    birth_date_exact: Optional[str] = None
    birth_place: Optional[str] = None
    is_birth_date_estimated: bool = False
    death_date_string: Optional[str] = None
    death_date_exact: Optional[str] = None
    death_place: Optional[str] = None
    is_death_date_estimated: bool = False
    cause_of_death: Optional[str] = None
    is_living: bool = True
    biography: Optional[str] = None
    notes: Optional[str] = None
    clan: Optional[str] = None
    tribe: Optional[str] = None
    traditional_titles: List[str] = Field(default_factory=list)
    facts: List[Fact] = Field(default_factory=list)
    identifiers: List[Identifier] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# Relationships
# ---------------------------------------------------------------------------

class RelationshipEvent(BaseModel):
    event_type: str
    date_string: Optional[str] = None
    date_exact: Optional[str] = None
    place: Optional[str] = None
    description: Optional[str] = None
    source_ids: List[UUID] = Field(default_factory=list)
    citations: List[str] = Field(default_factory=list)


class Relationship(BaseModel):
    id: UUID = Field(default_factory=uuid4)
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
    events: List[RelationshipEvent] = Field(default_factory=list)


class RelationshipCreate(BaseModel):
    person1_id: UUID
    person2_id: UUID
    relationship_type: RelationshipType
    spousal_status: Optional[SpousalStatus] = None
    start_date_string: Optional[str] = None
    place: Optional[str] = None
    notes: Optional[str] = None


# ---------------------------------------------------------------------------
# Family tree
# ---------------------------------------------------------------------------

class FamilyTreeSettings(BaseModel):
    default_person_privacy: PrivacySetting = PrivacySetting.FAMILY_TREE_ONLY
    theme: Optional[str] = None


class FamilyTree(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    name: str
    description: Optional[str] = None
    root_person_id: Optional[UUID] = None
    privacy: PrivacySetting = PrivacySetting.PRIVATE
    settings: Optional[FamilyTreeSettings] = None


class FamilyTreeCreate(BaseModel):
    name: str
    description: Optional[str] = None
    privacy: PrivacySetting = PrivacySetting.PRIVATE
    settings: Optional[FamilyTreeSettings] = None
    root_person_id: Optional[UUID] = None


# ---------------------------------------------------------------------------
# Life events
# ---------------------------------------------------------------------------

class LifeEvent(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    person_id: UUID
    event_type: str  # birth, death, marriage, migration, title_succession, custom...
    date_string: Optional[str] = None
    date_exact: Optional[str] = None
    place: Optional[str] = None
    description: Optional[str] = None
    confidence: Optional[Confidence] = None
    source_ids: List[UUID] = Field(default_factory=list)


class LifeEventCreate(BaseModel):
    event_type: str
    date_string: Optional[str] = None
    date_exact: Optional[str] = None
    place: Optional[str] = None
    description: Optional[str] = None
    confidence: Optional[Confidence] = None
    source_ids: List[UUID] = Field(default_factory=list)
