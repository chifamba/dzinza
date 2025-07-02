import uuid
from datetime import datetime
from typing import List, Optional, Dict, Any

from motor.motor_asyncio import AsyncIOMotorDatabase

from app.models_main import PersonHistory, PersonHistoryChangeType, Person # DB Models
from app.db.base import PERSON_HISTORY_COLLECTION, PERSONS_COLLECTION # Collection names

async def create_person_history_entry(
    db: AsyncIOMotorDatabase,
    *,
    person_id: uuid.UUID,
    changed_by_user_id: str,
    change_type: PersonHistoryChangeType,
    data_snapshot: Dict[str, Any], # Snapshot of the Person document
    version: Optional[int] = None, # Version number, if not provided, it will be calculated
    change_description: Optional[str] = None
) -> PersonHistory:
    """
    Create a new person history entry.
    If version is not provided, it calculates the next version number.
    """
    history_collection = db[PERSON_HISTORY_COLLECTION]
    now = datetime.utcnow()

    if version is None:
        # Find the latest version for this person and increment
        latest_history = await history_collection.find_one(
            {"person_id": person_id},
            sort=[("version", -1)] # Sort by version descending
        )
        current_version = latest_history["version"] if latest_history else 0
        version = current_version + 1

    db_history_entry = PersonHistory(
        person_id=person_id,
        version=version,
        data_snapshot=data_snapshot, # This should be the state of the Person *after* the change for updates
        changed_by_user_id=changed_by_user_id,
        change_type=change_type,
        change_description=change_description,
        created_at=now, # DBModelMixin handles id, created_at, updated_at
        updated_at=now  # For history, updated_at might be same as created_at
    )

    await history_collection.insert_one(db_history_entry.model_dump(by_alias=True))
    return db_history_entry


async def get_history_for_person(
    db: AsyncIOMotorDatabase, *, person_id: uuid.UUID,
    skip: int = 0, limit: int = 50 # History can be long
) -> List[PersonHistory]:
    """
    Get all history entries for a specific person, newest first.
    """
    collection = db[PERSON_HISTORY_COLLECTION]
    history_entries = []
    # Sort by version descending to get newest changes first
    cursor = collection.find({"person_id": person_id}).sort("version", -1).skip(skip).limit(limit)
    async for doc in cursor:
        history_entries.append(PersonHistory(**doc))
    return history_entries

async def get_person_version(
    db: AsyncIOMotorDatabase, *, person_id: uuid.UUID, version: int
) -> Optional[PersonHistory]:
    """
    Get a specific version of a person's history.
    """
    collection = db[PERSON_HISTORY_COLLECTION]
    doc = await collection.find_one({"person_id": person_id, "version": version})
    return PersonHistory(**doc) if doc else None

async def get_latest_person_version_number(
    db: AsyncIOMotorDatabase, *, person_id: uuid.UUID
) -> int:
    """Gets the latest version number for a person's history."""
    history_collection = db[PERSON_HISTORY_COLLECTION]
    latest_history = await history_collection.find_one(
        {"person_id": person_id},
        projection={"version": 1}, # Only fetch the version field
        sort=[("version", -1)]
    )
    return latest_history["version"] if latest_history else 0


# --- Integration with Person CRUD ---
# These functions would typically be called from within Person CRUD operations.

async def log_person_creation(
    db: AsyncIOMotorDatabase, *, person_doc: Dict[str, Any], changed_by_user_id: str
):
    """Logs the creation of a person."""
    # Person document (as dict) already contains the _id
    person_id = person_doc["_id"]
    await create_person_history_entry(
        db,
        person_id=person_id,
        changed_by_user_id=changed_by_user_id,
        change_type=PersonHistoryChangeType.CREATE,
        data_snapshot=person_doc, # Snapshot of the newly created person
        version=1 # First version
    )

async def log_person_update(
    db: AsyncIOMotorDatabase, *, person_id: uuid.UUID, updated_person_doc: Dict[str,Any], changed_by_user_id: str, change_description: Optional[str] = None
):
    """Logs an update to a person. updated_person_doc is the document *after* update."""
    current_version = await get_latest_person_version_number(db, person_id=person_id)
    new_version = current_version + 1

    await create_person_history_entry(
        db,
        person_id=person_id,
        changed_by_user_id=changed_by_user_id,
        change_type=PersonHistoryChangeType.UPDATE,
        data_snapshot=updated_person_doc, # Snapshot of the person *after* the update
        version=new_version,
        change_description=change_description
    )

async def log_person_deletion( # This would be tricky if person doc is already gone
    db: AsyncIOMotorDatabase, *, person_id: uuid.UUID, last_known_person_doc: Dict[str, Any], changed_by_user_id: str
):
    """Logs the deletion of a person. Requires the state *before* deletion."""
    current_version = await get_latest_person_version_number(db, person_id=person_id)
    new_version = current_version + 1 # Even for delete, it's a new history entry

    await create_person_history_entry(
        db,
        person_id=person_id, # The ID of the person being deleted
        changed_by_user_id=changed_by_user_id,
        change_type=PersonHistoryChangeType.DELETE,
        data_snapshot=last_known_person_doc, # Snapshot *before* deletion
        version=new_version,
        change_description="Person deleted from system."
    )

# Note: Reverting to a previous version would involve:
# 1. Fetching the Person document from PersonHistory.data_snapshot for the desired version.
# 2. Updating the main Person document in PERSONS_COLLECTION with this historical data.
# 3. Creating a new PersonHistory entry of type REVERT, with the snapshot being the state *after* revert.
