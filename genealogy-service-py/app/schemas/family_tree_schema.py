from pydantic import BaseModel, Field, validator
from typing import Optional, List, Any
import uuid # For owner_id, collaborator_ids
from datetime import datetime

from app.models.base_model import PyObjectId # For ID fields in responses
from app.models.family_tree_model import FamilyTreePrivacySettings # Import the model for direct use or re-definition

# Re-define or directly use the model's PrivacySettings for schema
class FamilyTreePrivacySettingsSchema(FamilyTreePrivacySettings): # Inherit from model
    pass

class CollaboratorSchema(BaseModel):
    user_id: uuid.UUID
    # role: str = "viewer" # "viewer", "editor", "admin" - if roles are implemented
    # For now, just a list of IDs as in the model

# Base properties shared by create and update schemas
class FamilyTreeBaseSchema(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    # collaborator_ids: Optional[List[uuid.UUID]] = None # Handled separately or as part of update
    privacy_settings: Optional[FamilyTreePrivacySettingsSchema] = None

# Schema for creating a family tree
class FamilyTreeCreateSchema(FamilyTreeBaseSchema):
    name: str = Field(..., min_length=1, max_length=100)
    # owner_id is set by the system based on the authenticated user, not part of request body

# Schema for updating a family tree
class FamilyTreeUpdateSchema(FamilyTreeBaseSchema):
    # All fields are optional for updates
    pass

# Schema for inviting/adding a collaborator
class FamilyTreeAddCollaboratorSchema(BaseModel):
    user_email: Optional[str] = None # Invite by email
    user_id: Optional[uuid.UUID] = None # Add by user ID
    # role: str = "viewer" # if roles are implemented

    @validator('user_id', always=True)
    def check_email_or_id(cls, v, values):
        if not values.get('user_email') and not v:
            raise ValueError('Either user_email or user_id must be provided')
        if values.get('user_email') and v:
            raise ValueError('Provide either user_email or user_id, not both')
        return v


# Properties to return to client
class FamilyTreeResponseSchema(FamilyTreeBaseSchema):
    id: PyObjectId = Field(alias="_id") # Use alias for MongoDB's _id
    owner_id: uuid.UUID
    collaborator_ids: List[uuid.UUID] = [] # Ensure it's always present in response
    member_count: int = 0
    created_at: datetime
    updated_at: datetime
    last_accessed_by_owner: Optional[datetime] = None

    class Config:
        from_attributes = True # orm_mode = True for Pydantic v1
        populate_by_name = True
        json_encoders = {
            PyObjectId: str, # Ensure PyObjectId is str in JSON output
            datetime: lambda dt: dt.isoformat(),
            uuid.UUID: str,
        }
