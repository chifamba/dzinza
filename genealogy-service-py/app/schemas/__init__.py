from .person_schema import (
    PersonCreateSchema,
    PersonUpdateSchema,
    PersonResponseSchema,
    PersonSearchSchema, # If distinct search schema is needed
    EventDetailSchema,
    NameDetailsSchema,
    ContactInfoSchema,
)
from .family_tree_schema import (
    FamilyTreeCreateSchema,
    FamilyTreeUpdateSchema,
    FamilyTreeResponseSchema,
    FamilyTreePrivacySettingsSchema,
    CollaboratorSchema,
)
from .relationship_schema import (
    RelationshipCreateSchema,
    RelationshipUpdateSchema,
    RelationshipResponseSchema,
    RelationshipEventSchema,
)
from .notification_schema import (
    NotificationCreateSchema, # Usually system-generated
    NotificationUpdateSchema, # e.g., marking as read
    NotificationResponseSchema,
)
from .merge_suggestion_schema import (
    MergeSuggestionCreateSchema, # Can be system or user generated
    MergeSuggestionUpdateSchema, # For status changes, reviews
    MergeSuggestionResponseSchema,
    SuggestedChangeDetailSchema,
)

# Base response for pagination if needed
from pydantic import BaseModel
from typing import List, TypeVar, Generic

T = TypeVar('T')

class PaginatedResponse(BaseModel, Generic[T]):
    items: List[T]
    total: int
    page: int
    size: int
    # pages: Optional[int] = None # Calculated if needed (total / size)
