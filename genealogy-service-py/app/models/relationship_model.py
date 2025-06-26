from pydantic import BaseModel, Field
from typing import Optional, List
from enum import Enum
from datetime import date

from app.models.base_model import BaseDocumentModel, PyObjectId

class RelationshipType(str, Enum):
    # Primary types
    MARRIAGE = "marriage"
    DIVORCE = "divorce" # Could be an event on a marriage relationship
    PARTNERSHIP = "partnership" # Non-marital union
    PARENT_CHILD = "parent_child" # This is directional, person1 is parent, person2 is child
    SIBLING = "sibling" # Usually inferred, but can be explicit

    # Extended family (can also be inferred but sometimes useful to state explicitly)
    # GRANDPARENT_GRANDCHILD = "grandparent_grandchild"
    # AUNT_UNCLE_NIECE_NEPHEW = "aunt_uncle_niece_nephew"
    # COUSIN = "cousin"

    # Adoptive / Step relationships
    ADOPTIVE_PARENT_CHILD = "adoptive_parent_child"
    STEP_PARENT_CHILD = "step_parent_child"
    # HALF_SIBLING = "half_sibling" # Usually inferred via one shared parent

    # Other
    GODPARENT_GODCHILD = "godparent_godchild"
    FRIEND = "friend" # If tracking non-familial relationships
    ASSOCIATE = "associate" # Business or other associations
    UNKNOWN = "unknown"


class RelationshipEvent(BaseModel):
    event_type: str # e.g., "marriage_ceremony", "divorce_filed", "partnership_start"
    date_exact: Optional[date] = None
    date_approximate: Optional[str] = None
    place: Optional[str] = Field(None, max_length=255)
    description: Optional[str] = Field(None, max_length=1000)

class RelationshipModel(BaseDocumentModel):
    family_tree_id: PyObjectId = Field(...) # Link to the family tree this relationship belongs to

    person1_id: PyObjectId = Field(...) # ID of the first person in the relationship
    # person1_role: Optional[str] = None # e.g., "husband", "parent", "sibling" (can be inferred from type)

    person2_id: PyObjectId = Field(...) # ID of the second person in the relationship
    # person2_role: Optional[str] = None # e.g., "wife", "child", "sibling" (can be inferred from type)

    relationship_type: RelationshipType = Field(...)

    # Optional details specific to the relationship type
    start_date_exact: Optional[date] = None # e.g., marriage date, partnership start
    start_date_approximate: Optional[str] = None

    end_date_exact: Optional[date] = None   # e.g., divorce date, death of a spouse, partnership end
    end_date_approximate: Optional[str] = None

    place_of_event: Optional[str] = Field(None, max_length=255) # e.g., place of marriage

    notes: Optional[str] = Field(None, max_length=2000)

    # For relationships like marriage, you might have a list of events
    # events: List[RelationshipEvent] = Field(default_factory=list)

    # For parent-child, you might specify if it's biological, adoptive, step, etc.
    # This can also be handled by specific RelationshipType values
    # parent_child_detail: Optional[str] = None # e.g., "biological", "adoptive", "step", "guardian"

    class Config:
        # collection_name = "relationships"
        json_encoders = {
            **BaseDocumentModel.Config.json_encoders,
            RelationshipType: lambda rt: rt.value,
            date: lambda d: d.isoformat() if d else None,
        }
        # Pydantic v2: model_config = ConfigDict(use_enum_values=True)

    # Ensure person1_id and person2_id are not the same for most relationship types
    # @root_validator(skip_on_failure=True) # Pydantic v1
    # def check_person_ids_differ(cls, values):
    #     p1 = values.get("person1_id")
    #     p2 = values.get("person2_id")
    #     rel_type = values.get("relationship_type")
    #     # Certain self-referential relationships might be valid in some ontologies, but generally not.
    #     if p1 and p2 and p1 == p2 and rel_type not in [SOME_SELF_REF_TYPE_IF_ANY]:
    #         raise ValueError("person1_id and person2_id cannot be the same for this relationship type.")
    #     return values

    # Ensure for PARENT_CHILD, person1 is parent and person2 is child (conceptual, hard to enforce at model level without context)
    # This is more of a convention for creating/interpreting the data.

    # Ensure relationship is unique (e.g. only one active marriage between two people at a time)
    # This kind of validation is usually done at the CRUD/service layer by querying existing relationships.
