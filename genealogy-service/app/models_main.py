import uuid
from datetime import datetime, date
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, HttpUrl, EmailStr, validator, model_validator
from enum import Enum

# --- Enums ---
class Gender(str, Enum):
    MALE = "male"
    FEMALE = "female"
    OTHER = "other"
    UNKNOWN = "unknown"

class PrivacySetting(str, Enum):
    PUBLIC = "public" # Viewable by anyone
    PRIVATE = "private" # Viewable only by owner (and collaborators if feature exists)
    SHARED = "shared" # Viewable by specific users/groups (future)
    FAMILY = "family" # Viewable by members of the associated family tree(s)

class RelationshipType(str, Enum):
    # Biological / Adoptive
    PARENT = "parent" # Person1 is parent of Person2
    CHILD = "child"   # Person1 is child of Person2 (inverse of parent)
    SIBLING = "sibling" # Biological or adoptive sibling
    HALF_SIBLING = "half_sibling"
    STEP_PARENT = "step_parent"
    STEP_CHILD = "step_child"
    STEP_SIBLING = "step_sibling"
    ADOPTIVE_PARENT = "adoptive_parent"
    ADOPTED_CHILD = "adopted_child"

    # Marital / Partnership
    SPOUSE = "spouse" # Husband, wife, partner in marriage or civil union
    PARTNER = "partner" # Non-marital long-term partnership
    FORMER_SPOUSE = "former_spouse"
    FIANCE = "fiance" # Engaged to be married

    # Other common genealogical relationships
    GRANDPARENT = "grandparent"
    GRANDCHILD = "grandchild"
    AUNT_UNCLE = "aunt_uncle" # Aunt or Uncle
    NIECE_NEPHEW = "niece_nephew"
    COUSIN = "cousin"
    GODPARENT = "godparent"
    GODCHILD = "godchild"

    # For more complex or custom relationships
    OTHER = "other"
    UNKNOWN = "unknown"

class EventType(str, Enum):
    BIRTH = "birth"
    DEATH = "death"
    MARRIAGE = "marriage"
    DIVORCE = "divorce"
    ANNULMENT = "annulment"
    ADOPTION = "adoption"
    BAPTISM = "baptism" # Christening, etc.
    BURIAL = "burial"
    CREMATION = "cremation"
    RESIDENCE = "residence"
    EDUCATION = "education"
    OCCUPATION = "occupation"
    RETIREMENT = "retirement"
    ENGAGEMENT = "engagement"
    MIGRATION = "migration"
    MILITARY_SERVICE = "military_service"
    CUSTOM = "custom" # For user-defined events
    OTHER = "other"

# --- Base Model for Timestamps and ID ---
class DBModelMixin(BaseModel):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, alias="_id")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True # Allows using "_id" from MongoDB and "id" in Pydantic
        json_encoders = {
            datetime: lambda dt: dt.isoformat(),
            date: lambda d: d.isoformat(),
            uuid.UUID: lambda u: str(u)
        }
        # Pydantic v2: use `from_attributes = True` instead of `orm_mode = True` for response models
        # extra = "allow" # or "forbid"

# --- Core Models ---

class FamilyTree(DBModelMixin):
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    owner_id: str # User ID of the creator/owner (from auth service)
    privacy: PrivacySetting = Field(default=PrivacySetting.PRIVATE)
    # person_ids: List[uuid.UUID] = Field(default_factory=list) # Denormalized list of persons in this tree
    # root_person_id: Optional[uuid.UUID] = None # Optional: main person of the tree

    class Config(DBModelMixin.Config):
        json_schema_extra = {
            "example": {
                "name": "The Doe Family Lineage",
                "description": "Tracing the Doe family back to the 1800s.",
                "owner_id": "user-123xyz",
                "privacy": "private"
            }
        }

class PersonName(BaseModel):
    given_name: Optional[str] = Field(None, max_length=100)
    surname: Optional[str] = Field(None, max_length=100)
    prefix: Optional[str] = Field(None, max_length=50)  # e.g., Dr., Rev.
    suffix: Optional[str] = Field(None, max_length=50)  # e.g., Jr., Sr., III
    nickname: Optional[str] = Field(None, max_length=100)
    # maiden_name: Optional[str] = None # Could be here or a specific event/fact

    @property
    def full_name(self) -> str:
        parts = []
        if self.prefix: parts.append(self.prefix)
        if self.given_name: parts.append(self.given_name)
        if self.surname: parts.append(self.surname)
        if self.suffix: parts.append(self.suffix)
        name_str = " ".join(filter(None, parts))
        if self.nickname:
            name_str += f" ({self.nickname})"
        return name_str or "Unknown"


class Fact(BaseModel): # Generic fact or attribute about a person
    type: str # e.g., "Birth Name", "Occupation", "Education", "Nationality"
    value: str
    date_string: Optional[str] = None # e.g., "about 1900", "Spring 1888"
    # date_start: Optional[date] = None
    # date_end: Optional[date] = None
    place: Optional[str] = None
    description: Optional[str] = None

# --- Updated Enums based on Node.js models ---
class Gender(str, Enum): # Updated
    MALE = "male"
    FEMALE = "female"
    NON_BINARY = "non_binary"
    OTHER = "other"
    UNKNOWN = "unknown"

class CollaboratorRole(str, Enum):
    VIEWER = "viewer"
    EDITOR = "editor"
    ADMIN = "admin"

class PersonPrivacyOptions(str, Enum):
    PUBLIC = "public"
    FAMILY_TREE_ONLY = "family_tree_only" # Equivalent to 'family' in FamilyTree privacy
    PRIVATE = "private"

class MergeSuggestionStatus(str, Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    DECLINED = "declined"

class PersonHistoryChangeType(str, Enum):
    CREATE = "create"
    UPDATE = "update"
    MERGE = "merge"
    DELETE = "delete"
    REVERT = "revert"

# --- Sub-models for FamilyTree ---
class Collaborator(BaseModel):
    user_id: str = Field(description="Reference to a User ID from an auth service")
    role: CollaboratorRole = Field(default=CollaboratorRole.VIEWER)
    added_at: datetime = Field(default_factory=datetime.utcnow)
    accepted_at: Optional[datetime] = None

class FamilyTreeSettings(BaseModel):
    allow_collaboration: bool = Field(default=True)
    show_living_persons: bool = Field(default=True, description="Controls visibility to non-collaborators or based on privacy")
    default_person_privacy: PersonPrivacyOptions = Field(default=PersonPrivacyOptions.FAMILY_TREE_ONLY)
    theme: str = Field(default="modern", max_length=50)

class FamilyTreeStatistics(BaseModel):
    total_persons: int = Field(default=0)
    total_generations: int = Field(default=0)
    completeness_score: float = Field(default=0.0, ge=0, le=100)


# --- Updated FamilyTree Model ---
class FamilyTree(DBModelMixin):
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    owner_id: str = Field(description="User ID of the creator/owner")
    root_person_id: Optional[uuid.UUID] = Field(None, description="Optional: main person of the tree")

    collaborators: List[Collaborator] = Field(default_factory=list)
    privacy: PrivacySetting = Field(default=PrivacySetting.PRIVATE) # Kept existing PrivacySetting enum

    settings: FamilyTreeSettings = Field(default_factory=FamilyTreeSettings)
    statistics: FamilyTreeStatistics = Field(default_factory=FamilyTreeStatistics)

    last_gedcom_import: Optional[datetime] = None
    last_gedcom_export: Optional[datetime] = None

    class Config(DBModelMixin.Config):
        json_schema_extra = {
            "example": {
                "name": "The Doe Family Lineage",
                "description": "Tracing the Doe family back to the 1800s.",
                "owner_id": "user-123xyz",
                "privacy": "private",
                "settings": {"allow_collaboration": True, "show_living_persons": False},
                "statistics": {"total_persons": 150}
            }
        }

# --- Sub-models for Person ---
class IdentifierType(str, Enum):
    NATIONAL_ID = "NationalID"
    PASSPORT = "Passport"
    DRIVER_LICENSE = "DriverLicense"
    BIRTH_CERTIFICATE = "BirthCertificate"
    EMAIL = "Email"
    PHONE = "Phone"
    OTHER = "Other"

class VerificationStatus(str, Enum):
    VERIFIED = "Verified"
    UNVERIFIED = "Unverified"
    PENDING = "Pending"

class Identifier(BaseModel):
    type: IdentifierType
    value: str = Field(..., max_length=255)
    verification_status: VerificationStatus = Field(default=VerificationStatus.UNVERIFIED)
    notes: Optional[str] = Field(None, max_length=500)

class PersonPrivacySettings(BaseModel):
    show_profile: PersonPrivacyOptions = Field(default=PersonPrivacyOptions.FAMILY_TREE_ONLY)
    show_birth_date: PersonPrivacyOptions = Field(default=PersonPrivacyOptions.FAMILY_TREE_ONLY)
    show_death_date: PersonPrivacyOptions = Field(default=PersonPrivacyOptions.FAMILY_TREE_ONLY)
    # Add more granular settings as needed

# --- Updated Person Model ---
class Person(DBModelMixin):
    # uniqueId from Node will be 'id' (UUID) in Python.
    tree_ids: List[uuid.UUID] = Field(default_factory=list, description="Family trees this person belongs to") # Changed from familyTreeId

    primary_name: PersonName = Field(default_factory=PersonName)
    alternate_names: List[PersonName] = Field(default_factory=list)

    gender: Gender = Field(default=Gender.UNKNOWN)

    birth_date_string: Optional[str] = Field(None, description="User input, e.g. 'Abt. 1880', 'Jan 1900'")
    birth_date_exact: Optional[date] = None
    birth_place: Optional[str] = Field(None, max_length=255)
    is_birth_date_estimated: bool = Field(default=False)

    death_date_string: Optional[str] = None
    death_date_exact: Optional[date] = None
    death_place: Optional[str] = Field(None, max_length=255)
    is_death_date_estimated: bool = Field(default=False)
    cause_of_death: Optional[str] = Field(None, max_length=255)

    is_living: bool = True

    identifiers: List[Identifier] = Field(default_factory=list)

    # biologicalMother, biologicalFather, legalParents from Node.js will be handled by Relationship model
    # spouses, siblings denormalized links from Node.js also handled by querying Relationship model

    biography: Optional[str] = Field(None, description="Biographical text")
    notes: Optional[str] = Field(None, description="General research notes")

    profile_image_url: Optional[HttpUrl] = None
    profile_image_id: Optional[uuid.UUID] = None

    # Cultural info
    clan: Optional[str] = Field(None, max_length=100)
    tribe: Optional[str] = Field(None, max_length=100)
    traditional_titles: List[str] = Field(default_factory=list)

    privacy_settings: PersonPrivacySettings = Field(default_factory=PersonPrivacySettings)

    facts: List[Fact] = Field(default_factory=list) # For other generic facts

    potential_duplicates: List[uuid.UUID] = Field(default_factory=list)
    merged_into_id: Optional[uuid.UUID] = None
    merged_from_ids: List[uuid.UUID] = Field(default_factory=list)

    class Config(DBModelMixin.Config):
        json_schema_extra = {
            "example": {
                "primary_name": {"given_name": "John", "surname": "Doe"},
                "gender": "male",
                "birth_date_string": "1950-03-15",
                "birth_place": "New York, USA",
                "is_living": False,
                "death_date_string": "2020-10-05",
                "death_place": "Florida, USA"
            }
        }

    @validator('death_date_exact', 'birth_date_exact', pre=True)
    def parse_date_fields(cls, value):
        if isinstance(value, str):
            try:
                # Attempt to parse common date formats, can be expanded
                return datetime.strptime(value, "%Y-%m-%d").date()
            except ValueError:
                return None
        return value

    @validator('is_living', always=True)
    def determine_living_status(cls, v, values):
        # If is_living is explicitly set, respect that value.
        if 'is_living' in values.model_fields_set: # Pydantic v2 way to check if field was provided
            return v
        # Otherwise, if death date is present, assume not living.
        if values.get('death_date_exact') or values.get('death_date_string'):
            return False
        return True # Default to living if no death date and not explicitly set

# --- Relationship Enums & Sub-models (from Node.js Relationship.ts) ---
class RelationshipType(str, Enum): # Refined based on Node.js model's RelationshipType and ParentalRole/SpousalStatus
    # General Types
    SPOUSE = "spouse" # Covers Married, DomesticPartnership, CustomaryUnion, LivingTogether from Node.js SpousalStatus
    PARENT_OF = "parent_of" # Person1 is parent of Person2
    CHILD_OF = "child_of"   # Person1 is child of Person2
    SIBLING_OF = "sibling_of"

    # More specific types that might imply roles or statuses
    ADOPTIVE_PARENT_OF = "adoptive_parent_of"
    ADOPTED_CHILD_OF = "adopted_child_of"
    STEP_PARENT_OF = "step_parent_of"
    STEP_CHILD_OF = "step_child_of"
    GUARDIAN_OF = "guardian_of" # From Node.js GuardianChild
    WARD_OF = "ward_of"         # Inverse of Guardian

    GODPARENT_OF = "godparent_of"
    GODCHILD_OF = "godchild_of"

    # Sibling variations (can also be facts/attributes on a SIBLING_OF relationship)
    HALF_SIBLING_OF = "half_sibling_of"
    STEP_SIBLING_OF = "step_sibling_of"
    # ADOPTIVE_SIBLING_OF = "adoptive_sibling_of" # Covered by SIBLING_OF + adoption events
    # FOSTER_SIBLING_OF = "foster_sibling_of"

    # Spousal status can be an attribute on the SPOUSE relationship
    # FIANCE_OF = "fiance_of" # Can be a state of SPOUSE relationship or separate type

    OTHER = "other"
    UNKNOWN = "unknown"

class SpousalStatus(str, Enum): # From Node.js model
    MARRIED = "Married"
    DIVORCED = "Divorced"
    WIDOWED = "Widowed"
    SEPARATED = "Separated"
    ANNULLED = "Annulled"
    DOMESTIC_PARTNERSHIP = "DomesticPartnership"
    CUSTOMARY_UNION = "CustomaryUnion"
    LIVING_TOGETHER = "LivingTogether"
    ENGAGED = "Engaged"
    OTHER = "Other"

class ParentalRole(str, Enum): # From Node.js model
    BIOLOGICAL_MOTHER = "BiologicalMother"
    BIOLOGICAL_FATHER = "BiologicalFather"
    ADOPTIVE_MOTHER = "AdoptiveMother"
    ADOPTIVE_FATHER = "AdoptiveFather"
    GUARDIAN = "Guardian"
    STEP_MOTHER = "StepMother"
    STEP_FATHER = "StepFather"
    FOSTER_PARENT = "FosterParent"
    SURROGATE_MOTHER = "SurrogateMother"
    SPERM_DONOR = "SpermDonor"
    EGG_DONOR = "EggDonor"
    OTHER = "Other"

class RelationshipEvent(BaseModel): # Embedded in Relationship
    event_type: str = Field(..., description="e.g., 'Marriage', 'Divorce', 'PartnershipStart'")
    date_string: Optional[str] = None
    date_exact: Optional[date] = None
    place: Optional[str] = Field(None, max_length=255)
    description: Optional[str] = Field(None, max_length=500)

# --- Updated Relationship Model ---
class Relationship(DBModelMixin):
    tree_id: uuid.UUID
    person1_id: uuid.UUID # "From" person
    person2_id: uuid.UUID # "To" person

    relationship_type: RelationshipType # Main type from refined enum

    # Optional attributes for specific relationship types
    parental_role_person1: Optional[ParentalRole] = Field(None, description="Role of person1 towards person2, if parent-child type")
    parental_role_person2: Optional[ParentalRole] = Field(None, description="Role of person2 towards person1, if parent-child type (e.g. for child's perspective)")
    spousal_status: Optional[SpousalStatus] = Field(None, description="Status if relationship_type is SPOUSE")

    start_date_string: Optional[str] = None
    start_date_exact: Optional[date] = None
    end_date_string: Optional[str] = None
    end_date_exact: Optional[date] = None

    place: Optional[str] = Field(None, max_length=255, description="e.g., place of marriage")
    notes: Optional[str] = Field(None, max_length=1000) # Increased length

    events: List[RelationshipEvent] = Field(default_factory=list)

    @model_validator(mode='after')
    def check_persons_not_same(cls, values: 'Relationship') -> 'Relationship':
        if values.person1_id == values.person2_id:
            raise ValueError("person1_id and person2_id cannot be the same for a relationship.")
        return values

    class Config(DBModelMixin.Config):
        json_schema_extra = {
            "example": {
                "tree_id": "tree-uuid-123",
                "person1_id": "person-uuid-john",
                "person2_id": "person-uuid-jane",
                "relationship_type": "spouse",
                "spousal_status": "Married",
                "start_date_string": "1970-06-01",
                "place": "Las Vegas, NV"
            }
        }

# --- Genealogical Event Model (Top-level, distinct from PersonHistory) ---
class Event(DBModelMixin): # This is my original Python Event, seems useful.
    tree_id: uuid.UUID
    primary_person_id: Optional[uuid.UUID] = None # Main subject (e.g., person born)
    secondary_person_id: Optional[uuid.UUID] = None # e.g., other parent, spouse
    relationship_id: Optional[uuid.UUID] = None # If event is for a relationship itself (though Relationship.events is preferred for direct relationship events)

    event_type: EventType # Original enum: BIRTH, DEATH, MARRIAGE etc.
    custom_event_type_name: Optional[str] = Field(None, description="Name if event_type is 'custom'")

    date_string: Optional[str] = None
    date_exact: Optional[date] = None
    place_name: Optional[str] = Field(None, max_length=255)
    description: Optional[str] = Field(None, max_length=1000)
    notes: Optional[str] = Field(None, max_length=1000)

    # media_ids: List[uuid.UUID] = Field(default_factory=list) # Links to media items
    # source_ids: List[uuid.UUID] = Field(default_factory=list) # Links to Source records

    @validator('custom_event_type_name')
    def check_custom_event_name(cls, v, values):
        # This validator needs access to 'event_type' from values.
        # In Pydantic v2, for model_validator, values is the model instance.
        # For field validators, values is a dict of fields already processed.
        # This should be a model_validator or ensure event_type is processed first.
        # For simplicity, assuming event_type is available in `values.get('event_type')` context.
        event_type_val = values.get('event_type')
        if event_type_val == EventType.CUSTOM and not v:
            raise ValueError("custom_event_type_name is required when event_type is 'custom'")
        if event_type_val != EventType.CUSTOM and v:
            raise ValueError("custom_event_type_name should only be provided when event_type is 'custom'")
        return v

    class Config(DBModelMixin.Config):
        json_schema_extra = {
            "example": {
                "tree_id": "tree-uuid-123",
                "primary_person_id": "person-uuid-john",
                "event_type": "birth",
                "date_string": "1950-03-15",
                "place_name": "New York, USA"
            }
        }

# --- New Models based on Node.js service ---

class Notification(DBModelMixin):
    user_id: str = Field(..., description="User to notify (from auth service)")
    type: str = Field(..., max_length=50, description="e.g., 'merge_suggestion', 'info', 'event_reminder'")
    message: str = Field(..., max_length=500)
    data: Optional[Dict[str, Any]] = Field(None, description="Optional payload for frontend actions")
    read: bool = Field(default=False)

    class Config(DBModelMixin.Config):
        json_schema_extra = {
            "example": {
                "user_id": "user-abc-123",
                "type": "new_merge_suggestion",
                "message": "You have a new merge suggestion for John Doe.",
                "data": {"suggestion_id": "suggestion-uuid-456", "person_name": "John Doe"}
            }
        }

class MergeSuggestion(DBModelMixin):
    # Assuming tree_id context is implicit or handled by application logic querying suggestions
    new_person_id: uuid.UUID = Field(description="Reference to a Person model")
    existing_person_id: uuid.UUID = Field(description="Reference to another Person model")
    confidence: float = Field(..., ge=0, le=1, description="Confidence score for the merge suggestion")
    status: MergeSuggestionStatus = Field(default=MergeSuggestionStatus.PENDING)
    created_by_user_id: Optional[str] = Field(None, description="User ID of suggester, if manual")
    created_by_system: bool = Field(default=False, description="True if system-generated suggestion")
    # notified_users: List[str] = Field(default_factory=list, description="User IDs notified") # User IDs not ObjectIds
    # preview_tree: Optional[Dict[str, Any]] = Field(None, description="JSON snapshot of relevant parts for preview") # Complex, consider if needed

    class Config(DBModelMixin.Config):
        json_schema_extra = {
            "example": {
                "new_person_id": "person-uuid-new",
                "existing_person_id": "person-uuid-existing",
                "confidence": 0.85,
                "status": "pending"
            }
        }

class PersonHistory(DBModelMixin):
    person_id: uuid.UUID = Field(description="Reference to the Person model")
    version: int = Field(..., ge=1)
    data_snapshot: Dict[str, Any] = Field(..., description="Snapshot of the Person document at this version")
    changed_by_user_id: str = Field(description="User ID of who made the change")
    change_type: PersonHistoryChangeType
    change_description: Optional[str] = Field(None, max_length=500, description="Optional summary of change")

    class Config(DBModelMixin.Config):
        # Ensure this is ordered by version for a given person_id in queries
        json_schema_extra = {
            "example": {
                "person_id": "person-uuid-target",
                "version": 2,
                "data_snapshot": {"primary_name": {"surname": "Doe Updated"}},
                "changed_by_user_id": "user-xyz-789",
                "change_type": "update"
            }
        }


# --- Schemas for API input/output (can derive from models or be specific) ---
# These were defined before, ensure they are compatible or update them.
# For brevity, I'll assume the previously defined Create/Read schemas for Person and FamilyTree
# will be reviewed and updated as necessary after these model changes.

# Example for PersonCreate, ensuring it aligns with new Person model structure
class PersonCreate(BaseModel):
    tree_ids: List[uuid.UUID] = Field(..., description="One or more tree IDs this person belongs to")
    primary_name: PersonName
    gender: Optional[Gender] = Gender.UNKNOWN
    birth_date_string: Optional[str] = None
    birth_date_exact: Optional[date] = None
    birth_place: Optional[str] = None
    is_birth_date_estimated: Optional[bool] = False
    death_date_string: Optional[str] = None
    death_date_exact: Optional[date] = None
    death_place: Optional[str] = None
    is_death_date_estimated: Optional[bool] = False
    cause_of_death: Optional[str] = None
    is_living: Optional[bool] = None # Let validator determine if not provided
    biography: Optional[str] = None
    notes: Optional[str] = None
    profile_image_id: Optional[uuid.UUID] = None
    clan: Optional[str] = None
    tribe: Optional[str] = None
    traditional_titles: Optional[List[str]] = Field(default_factory=list)
    privacy_settings: Optional[PersonPrivacySettings] = Field(default_factory=PersonPrivacySettings)
    facts: Optional[List[Fact]] = Field(default_factory=list)
    identifiers: Optional[List[Identifier]] = Field(default_factory=list)

class PersonRead(Person): # Inherits all from Person model
    pass

class FamilyTreeCreate(BaseModel): # Already defined, review for consistency
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    privacy: Optional[PrivacySetting] = PrivacySetting.PRIVATE
    settings: Optional[FamilyTreeSettings] = Field(default_factory=FamilyTreeSettings)
    root_person_id: Optional[uuid.UUID] = None


class FamilyTreeRead(FamilyTree): # Already defined
    pass

# Relationship, Event, Notification, MergeSuggestion, PersonHistory schemas
# have been moved to their respective files in app/schemas/
