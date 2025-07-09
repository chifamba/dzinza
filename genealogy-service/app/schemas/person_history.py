import uuid
from typing import List
from pydantic import BaseModel

from app.models_main import PersonHistory as PersonHistoryDB

# --- PersonHistory Schemas ---

# PersonHistory records are typically system-generated during CRUD operations on Person.
# So, a direct Create schema for API input might not be common unless importing history.

class PersonHistoryRead(PersonHistoryDB): # Inherits from the DB model
    # changed_by_user_details: Optional[UserSummary] = None # Example if you populate user info
    class Config:
        from_attributes = True

class PersonHistoryList(BaseModel):
    items: List[PersonHistoryRead]
    total: int
    person_id: uuid.UUID # To indicate which person this history list is for
    # current_version: Optional[int] = None # Could be useful to show latest version number of the person
