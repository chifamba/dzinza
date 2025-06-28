from pydantic import Field
from typing import Optional, List, Dict, Any
import uuid # For owner_id, collaborator_ids

from app.models.base_model import BaseDocumentModel, PyObjectId

class FamilyTreePrivacySettings(BaseModel):
    # Define privacy settings, e.g., public, private, shared_with_link
    visibility: str = "private"  # "public", "private", "shared"
    allow_member_invites: bool = True
    # Add other specific settings as needed

class FamilyTreeModel(BaseDocumentModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    owner_id: uuid.UUID = Field(...) # UUID of the user who owns this tree (from auth-service)

    # Store collaborators with their roles/permissions if needed
    # Example: collaborators: List[Dict[str, Any]] = [] # [{"user_id": uuid.UUID, "role": "editor"}]
    # Or a simpler list of user_ids if roles are not granular within a tree
    collaborator_ids: List[uuid.UUID] = Field(default_factory=list)

    privacy_settings: FamilyTreePrivacySettings = Field(default_factory=FamilyTreePrivacySettings)

    # Metadata
    member_count: int = Field(default=0) # Denormalized count, update with person additions/removals
    last_accessed_by_owner: Optional[datetime] = None # For user dashboard sorting

    # GEDCOM import/export status (if feature is ported)
    # gedcom_import_id: Optional[PyObjectId] = None
    # gedcom_last_export_at: Optional[datetime] = None

    class Config:
        # Example for creating an index in MongoDB via Pydantic model (less common, usually done in database.py)
        # But Pydantic itself doesn't create DB indexes. This is more for documentation.
        # collection_name = "family_trees"
        # indexes = [
        #     IndexModel([("owner_id", pymongo.ASCENDING)]),
        #     IndexModel([("name", pymongo.ASCENDING)])
        # ]
        pass

# Example of how you might structure collaborator info if more detailed
# class Collaborator(BaseModel):
#     user_id: uuid.UUID
#     role: str # e.g., "viewer", "editor", "admin" (tree-specific admin)
#     added_at: datetime = Field(default_factory=datetime.utcnow)

from datetime import datetime # for last_accessed_by_owner type hint. Already in base_model but good for clarity.
