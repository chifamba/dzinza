import uuid
from typing import Optional, List
from pydantic import BaseModel, Field

from app.models import PrivacySetting, FamilyTree # Import base model for Read schema

# --- FamilyTree Schemas ---

# Properties to receive on item creation
class FamilyTreeCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100, description="Name of the family tree")
    description: Optional[str] = Field(None, max_length=500, description="Optional description for the tree")
    privacy: PrivacySetting = Field(default=PrivacySetting.PRIVATE, description="Privacy setting for the tree")

    class Config:
        json_schema_extra = {
            "example": {
                "name": "The Public Doe Lineage",
                "description": "A publicly viewable tree of the Doe family.",
                "privacy": "public"
            }
        }

# Properties to receive on item update
class FamilyTreeUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    privacy: Optional[PrivacySetting] = None
    # root_person_id: Optional[uuid.UUID] = None # If allowing root person to be updated

    class Config:
        json_schema_extra = {
            "example": {
                "name": "Doe Family History (Revised)",
                "privacy": "private"
            }
        }

# Properties shared by models stored in DB - Can be part of the base model itself
# class FamilyTreeInDBBase(FamilyTreeCreate): # Example if inheriting from Create
#     id: uuid.UUID
#     owner_id: str
#     created_at: datetime
#     updated_at: datetime
#     class Config:
#         from_attributes = True # Pydantic v2 ORM mode

# Properties to return to client (often includes fields from DBModelMixin)
class FamilyTreeRead(FamilyTree): # Inherits all fields from the main FamilyTree model
    # If you need to transform or add fields for reading, do it here.
    # For example, if person_ids were stored and you wanted to return full person objects,
    # this would be a place for such a field (though it would require more complex resolver logic).
    # For now, direct inheritance is fine.
    class Config:
        from_attributes = True # Ensure it can be created from ORM/DB model instances

# For lists of family trees
class FamilyTreeList(BaseModel):
    items: List[FamilyTreeRead]
    total: int

# You might also want a simpler schema for listing trees if FamilyTreeRead is too verbose for a list view
class FamilyTreeSummary(BaseModel):
    id: uuid.UUID
    name: str
    privacy: PrivacySetting
    updated_at: datetime # From DBModelMixin

    class Config:
        from_attributes = True
