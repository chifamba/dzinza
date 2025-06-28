from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List, Optional, Dict, Any
import uuid
from bson import ObjectId
from datetime import datetime, timezone

from app.models.person_history_model import PersonHistoryModel # Assuming schema is same as model for creation
from app.models.person_model import PersonModel # For the snapshot
from app.models.base_model import PyObjectId

COLLECTION_NAME = "person_history"

async def log_person_change(
    db: AsyncIOMotorDatabase,
    person_id: PyObjectId,
    family_tree_id: PyObjectId, # Denormalized from person document for context
    changed_by_user_id: uuid.UUID,
    action_type: str, # "create", "update", "delete"
    person_data_snapshot: PersonModel, # Current state of the PersonModel
    change_reason: Optional[str] = None
    # changes_diff: Optional[List[Dict[str, Any]]] = None # If storing diffs instead/additionally
) -> Optional[PersonHistoryModel]:

    history_entry_data = {
        "person_id": ObjectId(str(person_id)),
        "family_tree_id": ObjectId(str(family_tree_id)),
        "changed_by_user_id": changed_by_user_id,
        "action_type": action_type,
        "person_data_snapshot": person_data_snapshot.model_dump(by_alias=True), # Store the full snapshot as dict
        "timestamp": datetime.now(timezone.utc), # Should match the actual change time
        "created_at": datetime.now(timezone.utc), # BaseDocumentModel fields
        "updated_at": datetime.now(timezone.utc), # BaseDocumentModel fields
    }
    if change_reason:
        history_entry_data["change_reason"] = change_reason
    # if changes_diff:
    #     history_entry_data["changes"] = changes_diff


    result = await db[COLLECTION_NAME].insert_one(history_entry_data)
    created_history_doc = await db[COLLECTION_NAME].find_one({"_id": result.inserted_id})
    return PersonHistoryModel(**created_history_doc) if created_history_doc else None


async def get_person_history(
    db: AsyncIOMotorDatabase,
    person_id: PyObjectId,
    skip: int = 0,
    limit: int = 20,
    sort_desc: bool = True # Newest changes first
) -> List[PersonHistoryModel]:
    if not isinstance(person_id, ObjectId):
        person_id = ObjectId(str(person_id))

    sort_order = -1 if sort_desc else 1
    history_cursor = db[COLLECTION_NAME].find({"person_id": person_id}).sort("timestamp", sort_order).skip(skip).limit(limit)
    history_list = await history_cursor.to_list(length=limit)
    return [PersonHistoryModel(**entry) for entry in history_list]

async def count_person_history_entries(db: AsyncIOMotorDatabase, person_id: PyObjectId) -> int:
    if not isinstance(person_id, ObjectId):
        person_id = ObjectId(str(person_id))
    return await db[COLLECTION_NAME].count_documents({"person_id": person_id})


async def get_latest_person_snapshot_from_history(
    db: AsyncIOMotorDatabase,
    person_id: PyObjectId
) -> Optional[PersonModel]:
    """
    Retrieves the most recent snapshot of a person from their history.
    Useful if the main 'persons' collection data is ever suspect or for auditing.
    """
    if not isinstance(person_id, ObjectId):
        person_id = ObjectId(str(person_id))

    latest_history_entry_doc = await db[COLLECTION_NAME].find_one(
        {"person_id": person_id},
        sort=[("timestamp", -1)] # Get the newest entry
    )
    if latest_history_entry_doc and "person_data_snapshot" in latest_history_entry_doc:
        # The snapshot is stored as a dict, so parse it back into PersonModel
        return PersonModel(**latest_history_entry_doc["person_data_snapshot"])
    return None

async def delete_history_for_person(db: AsyncIOMotorDatabase, person_id: PyObjectId) -> int:
    """Deletes all history entries for a specific person. Use with caution."""
    if not isinstance(person_id, ObjectId):
        person_id = ObjectId(str(person_id))
    result = await db[COLLECTION_NAME].delete_many({"person_id": person_id})
    return result.deleted_count

async def delete_history_for_family_tree(db: AsyncIOMotorDatabase, family_tree_id: PyObjectId) -> int:
    """Deletes all person history entries associated with a specific family tree. Use with caution."""
    if not isinstance(family_tree_id, ObjectId):
        family_tree_id = ObjectId(str(family_tree_id))
    result = await db[COLLECTION_NAME].delete_many({"family_tree_id": family_tree_id})
    return result.deleted_count
