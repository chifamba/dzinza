from motor.motor_asyncio import AsyncIOMotorDatabase, AsyncIOMotorCollection
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime

from app.models import FileRecord, FileUpdateSchema # Pydantic models
from app.database import get_database # To get DB instance

# It's good practice to define collection names centrally
FILES_COLLECTION = "files"

def get_file_collection(db: AsyncIOMotorDatabase) -> AsyncIOMotorCollection:
    return db[FILES_COLLECTION]

async def create_file_record(db: AsyncIOMotorDatabase, file_data: FileRecord) -> FileRecord:
    """
    Creates a new file metadata record in MongoDB.
    `file_data` should be a FileRecord Pydantic model instance.
    """
    collection = get_file_collection(db)
    # Pydantic model_dump(by_alias=True) is useful if your model has field aliases (like id -> _id)
    # For FileRecord, we defined id = Field(default_factory=uuid.uuid4, alias="_id")
    # So, when inserting, we want MongoDB to use _id.
    file_dict = file_data.model_dump(by_alias=True)

    # Ensure `uploaded_at` and `updated_at` are set if not already
    now = datetime.utcnow()
    if 'uploaded_at' not in file_dict or file_dict['uploaded_at'] is None:
        file_dict['uploaded_at'] = now
    if 'updated_at' not in file_dict or file_dict['updated_at'] is None:
        file_dict['updated_at'] = now

    result = await collection.insert_one(file_dict)

    # Fetch the inserted document to return the full FileRecord with the generated _id
    # Or, if confident about the input `file_data.id` (which is `_id`), we can return `file_data`
    # However, it's safer to fetch, or update file_data with inserted_id if different.
    # Since `id` is default_factory=uuid.uuid4 and aliased to _id, file_dict["_id"] should be correct.

    created_document = await collection.find_one({"_id": result.inserted_id})
    if created_document:
        return FileRecord(**created_document) # Re-validate with Pydantic model
    raise Exception("Failed to retrieve created file record") # Should not happen

async def get_file_record_by_id(db: AsyncIOMotorDatabase, file_id: uuid.UUID, user_id: Optional[str] = None) -> Optional[FileRecord]:
    """
    Retrieves a file record by its ID.
    Optionally filters by user_id if provided.
    """
    collection = get_file_collection(db)
    query: Dict[str, Any] = {"_id": file_id, "is_deleted": False}
    if user_id:
        query["user_id"] = user_id

    document = await collection.find_one(query)
    if document:
        return FileRecord(**document)
    return None

async def check_file_exists(db: AsyncIOMotorDatabase, file_id: uuid.UUID, user_id: Optional[str] = None) -> bool:
    """
    Checks if a file record exists by its ID, regardless of soft-delete status.
    Optionally filters by user_id if provided.
    Returns True if the document exists, False otherwise.
    """
    collection = get_file_collection(db)
    query: Dict[str, Any] = {"_id": file_id}
    if user_id:
        query["user_id"] = user_id

    # Use count_documents for a more lightweight check if we don't need the document itself
    count = await collection.count_documents(query)
    return count > 0

async def get_file_records(
    db: AsyncIOMotorDatabase,
    user_id: str, # Usually, listing is user-specific
    family_tree_id: Optional[str] = None,
    category: Optional[str] = None,
    tags: Optional[List[str]] = None,
    search_query: Optional[str] = None,
    skip: int = 0,
    limit: int = 20,
    sort_by: str = "uploaded_at",
    sort_order: int = -1 # -1 for descending, 1 for ascending
) -> List[FileRecord]:
    """
    Retrieves a list of file records with filtering, pagination, and sorting.
    """
    collection = get_file_collection(db)
    query: Dict[str, Any] = {"user_id": user_id, "is_deleted": False}

    if family_tree_id:
        query["family_tree_id"] = family_tree_id
    if category:
        query["category"] = category
    if tags:
        query["tags"] = {"$in": tags} # Assumes tags is a list of strings to match
    if search_query:
        query["$or"] = [
            {"original_name": {"$regex": search_query, "$options": "i"}},
            {"description": {"$regex": search_query, "$options": "i"}},
            {"tags": {"$regex": search_query, "$options": "i"}} # Search in tags array
        ]
        # More complex text search might use MongoDB text indexes: query["$text"] = {"$search": search_query}

    cursor = collection.find(query).sort(sort_by, sort_order).skip(skip).limit(limit)
    records = []
    async for document in cursor:
        records.append(FileRecord(**document))
    return records

async def count_file_records(
    db: AsyncIOMotorDatabase,
    user_id: str,
    family_tree_id: Optional[str] = None,
    category: Optional[str] = None,
    tags: Optional[List[str]] = None,
    search_query: Optional[str] = None
) -> int:
    """
    Counts file records based on filters.
    """
    collection = get_file_collection(db)
    query: Dict[str, Any] = {"user_id": user_id, "is_deleted": False}
    if family_tree_id:
        query["family_tree_id"] = family_tree_id
    if category:
        query["category"] = category
    if tags:
        query["tags"] = {"$in": tags}
    if search_query:
        query["$or"] = [
            {"original_name": {"$regex": search_query, "$options": "i"}},
            {"description": {"$regex": search_query, "$options": "i"}},
            {"tags": {"$regex": search_query, "$options": "i"}}
        ]

    count = await collection.count_documents(query)
    return count

async def update_file_record(
    db: AsyncIOMotorDatabase,
    file_id: uuid.UUID,
    user_id: str, # Ensure user owns the file
    update_data: FileUpdateSchema
) -> Optional[FileRecord]:
    """
    Updates a file record's metadata.
    `update_data` is a Pydantic model instance (FileUpdateSchema).
    """
    collection = get_file_collection(db)

    # Convert Pydantic model to dict, excluding unset fields to avoid overwriting with None
    update_dict = update_data.model_dump(exclude_unset=True)

    if not update_dict: # No actual updates provided
        # Fetch and return current record or handle as no-op
        return await get_file_record_by_id(db, file_id=file_id, user_id=user_id)

    update_dict["updated_at"] = datetime.utcnow()

    result = await collection.find_one_and_update(
        {"_id": file_id, "user_id": user_id, "is_deleted": False},
        {"$set": update_dict},
        return_document=True # Return the updated document
    )
    if result:
        return FileRecord(**result)
    return None

async def soft_delete_file_record(db: AsyncIOMotorDatabase, file_id: uuid.UUID, user_id: str) -> bool:
    """
    Soft deletes a file record by marking `is_deleted` to True.
    Returns True if successful, False otherwise (e.g., file not found or not owned by user).
    """
    collection = get_file_collection(db)
    result = await collection.update_one(
        {"_id": file_id, "user_id": user_id, "is_deleted": False},
        {"$set": {"is_deleted": True, "deleted_at": datetime.utcnow(), "updated_at": datetime.utcnow()}}
    )
    return result.modified_count > 0

async def hard_delete_file_record(db: AsyncIOMotorDatabase, file_id: uuid.UUID, user_id: str) -> bool:
    """
    Permanently deletes a file record from MongoDB.
    This should be used after the corresponding file is deleted from S3.
    Returns True if successful, False otherwise.
    """
    collection = get_file_collection(db)
    result = await collection.delete_one({"_id": file_id, "user_id": user_id})
    return result.deleted_count > 0

# --- Internal Event Association CRUD ---
async def associate_event_with_file(db: AsyncIOMotorDatabase, file_id: uuid.UUID, event_id: str) -> Optional[FileRecord]:
    collection = get_file_collection(db)
    result = await collection.find_one_and_update(
        {"_id": file_id},
        {"$addToSet": {"related_events": event_id}, "$set": {"updated_at": datetime.utcnow()}},
        return_document=True
    )
    return FileRecord(**result) if result else None

async def disassociate_event_from_file(db: AsyncIOMotorDatabase, file_id: uuid.UUID, event_id: str) -> Optional[FileRecord]:
    collection = get_file_collection(db)
    result = await collection.find_one_and_update(
        {"_id": file_id},
        {"$pull": {"related_events": event_id}, "$set": {"updated_at": datetime.utcnow()}},
        return_document=True
    )
    return FileRecord(**result) if result else None


async def associate_person_with_file(db: AsyncIOMotorDatabase, file_id: uuid.UUID, person_id: str) -> Optional[FileRecord]:
    collection = get_file_collection(db)
    result = await collection.find_one_and_update(
        {"_id": file_id},
        {"$addToSet": {"related_persons": person_id}, "$set": {"updated_at": datetime.utcnow()}},
        return_document=True
    )
    return FileRecord(**result) if result else None

async def disassociate_person_from_file(db: AsyncIOMotorDatabase, file_id: uuid.UUID, person_id: str) -> Optional[FileRecord]:
    collection = get_file_collection(db)
    result = await collection.find_one_and_update(
        {"_id": file_id},
        {"$pull": {"related_persons": person_id}, "$set": {"updated_at": datetime.utcnow()}},
        return_document=True
    )
    return FileRecord(**result) if result else None

# TODO: Add CRUD for CleanupService if it needs to interact with the DB directly for marking files
# e.g., finding temporary/orphaned FileRecords.
# For now, CleanupService might operate more on S3 listing and then call delete_file_record.Tool output for `create_file_with_block`:
