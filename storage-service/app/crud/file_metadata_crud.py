from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List, Optional, Dict, Any, Union
import uuid
from bson import ObjectId
from datetime import datetime, timezone

from app.models.file_metadata_model import FileMetadataModel, FileStatus, FileType
from app.schemas.file_schema import FileUpdateSchema, FileListQuerySchema # For query params
from app.models.base_model import PyObjectId

COLLECTION_NAME = "file_metadata"

async def create_file_metadata(db: AsyncIOMotorDatabase, file_data: Dict[str, Any]) -> Optional[FileMetadataModel]:
    """
    Creates a new file metadata record.
    Expects file_data to be a dictionary ready for MongoDB insertion,
    including user_id, original_filename, mime_type, size_bytes, etc.
    Timestamps (created_at, updated_at) and initial status should be set before calling this.
    """
    # Ensure required fields are present (can also be done by Pydantic model before this call)
    if not all(k in file_data for k in ["user_id", "original_filename", "mime_type", "size_bytes"]):
        # Log error or raise exception
        return None

    file_data["created_at"] = file_data.get("created_at", datetime.now(timezone.utc))
    file_data["updated_at"] = file_data.get("updated_at", datetime.now(timezone.utc))
    file_data["status"] = file_data.get("status", FileStatus.UPLOADING)

    # Convert PyObjectId fields to ObjectId if they are passed as strings or PyObjectId instances
    for key in ["family_tree_id", "person_id"]:
        if key in file_data and file_data[key] is not None:
            if not isinstance(file_data[key], ObjectId):
                file_data[key] = ObjectId(str(file_data[key]))

    result = await db[COLLECTION_NAME].insert_one(file_data)
    created_doc = await db[COLLECTION_NAME].find_one({"_id": result.inserted_id})
    return FileMetadataModel(**created_doc) if created_doc else None

async def get_file_metadata_by_id(db: AsyncIOMotorDatabase, file_id: PyObjectId) -> Optional[FileMetadataModel]:
    if not isinstance(file_id, ObjectId):
        if ObjectId.is_valid(str(file_id)):
            file_id = ObjectId(str(file_id))
        else:
            return None

    doc = await db[COLLECTION_NAME].find_one({"_id": file_id})
    return FileMetadataModel(**doc) if doc else None

async def get_file_metadata_by_s3_key(db: AsyncIOMotorDatabase, s3_key: str) -> Optional[FileMetadataModel]:
    doc = await db[COLLECTION_NAME].find_one({"s3_key": s3_key})
    return FileMetadataModel(**doc) if doc else None


async def update_file_metadata(db: AsyncIOMotorDatabase, file_id: PyObjectId, update_data: Union[FileUpdateSchema, Dict[str, Any]]) -> Optional[FileMetadataModel]:
    if not isinstance(file_id, ObjectId):
        file_id = ObjectId(str(file_id))

    if isinstance(update_data, FileUpdateSchema):
        update_dict = update_data.model_dump(exclude_unset=True)
    else: # It's already a dict
        update_dict = update_data

    if not update_dict: # Nothing to update if empty (excluding updated_at)
        if "updated_at" not in update_dict or len(update_dict) == 1:
             return await get_file_metadata_by_id(db, file_id)

    update_dict["updated_at"] = datetime.now(timezone.utc)

    # Convert PyObjectId fields to ObjectId for update if present
    for key in ["family_tree_id", "person_id"]:
        if key in update_dict and update_dict[key] is not None:
            if not isinstance(update_dict[key], ObjectId):
                update_dict[key] = ObjectId(str(update_dict[key]))

    # Convert enum fields to their values if they are passed as enum members
    if "status" in update_dict and isinstance(update_dict["status"], FileStatus):
        update_dict["status"] = update_dict["status"].value
    if "file_type" in update_dict and isinstance(update_dict["file_type"], FileType):
        update_dict["file_type"] = update_dict["file_type"].value


    result = await db[COLLECTION_NAME].update_one(
        {"_id": file_id},
        {"$set": update_dict}
    )
    if result.modified_count >= 0: # Even if 0 (data was same), fetch and return
        updated_doc = await db[COLLECTION_NAME].find_one({"_id": file_id})
        return FileMetadataModel(**updated_doc) if updated_doc else None
    return None


async def delete_file_metadata(db: AsyncIOMotorDatabase, file_id: PyObjectId) -> bool:
    """
    Deletes the metadata record. Does not delete the actual file from S3/storage.
    That should be handled by a service layer or cleanup task.
    Consider soft delete (setting status to DELETED) instead of hard delete.
    """
    if not isinstance(file_id, ObjectId):
        file_id = ObjectId(str(file_id))

    result = await db[COLLECTION_NAME].delete_one({"_id": file_id})
    return result.deleted_count == 1


async def list_files_metadata(
    db: AsyncIOMotorDatabase,
    query_params: FileListQuerySchema, # Use a Pydantic model for query params
    skip: int = 0,
    limit: int = 20
) -> List[FileMetadataModel]:
    query: Dict[str, Any] = {}
    if query_params.user_id:
        query["user_id"] = query_params.user_id
    if query_params.family_tree_id:
        query["family_tree_id"] = ObjectId(str(query_params.family_tree_id))
    if query_params.person_id:
        query["person_id"] = ObjectId(str(query_params.person_id))
    if query_params.file_type:
        query["file_type"] = query_params.file_type.value
    if query_params.status:
        query["status"] = query_params.status.value
    if query_params.original_filename_contains:
        query["original_filename"] = {"$regex": query_params.original_filename_contains, "$options": "i"}
    if query_params.tag:
        query["tags"] = query_params.tag # Matches if tag is in the 'tags' array

    # Add more filters as needed (e.g., date ranges)

    cursor = db[COLLECTION_NAME].find(query).sort("created_at", -1).skip(skip).limit(limit)
    docs = await cursor.to_list(length=limit)
    return [FileMetadataModel(**doc) for doc in docs]

async def count_files_metadata(db: AsyncIOMotorDatabase, query_params: FileListQuerySchema) -> int:
    query: Dict[str, Any] = {}
    # Build query same as in list_files_metadata
    if query_params.user_id:
        query["user_id"] = query_params.user_id
    if query_params.family_tree_id:
        query["family_tree_id"] = ObjectId(str(query_params.family_tree_id))
    # ... (add other query params as above) ...
    if query_params.file_type: query["file_type"] = query_params.file_type.value
    if query_params.status: query["status"] = query_params.status.value
    if query_params.original_filename_contains: query["original_filename"] = {"$regex": query_params.original_filename_contains, "$options": "i"}
    if query_params.tag: query["tags"] = query_params.tag

    return await db[COLLECTION_NAME].count_documents(query)

async def get_temporary_files_for_cleanup(db: AsyncIOMotorDatabase, max_age_datetime: datetime) -> List[FileMetadataModel]:
    """Fetches temporary files older than a certain age."""
    query = {
        "is_temporary": True,
        "created_at": {"$lt": max_age_datetime}
        # Optionally, also check for status (e.g., still UPLOADING or ERROR after long time)
    }
    cursor = db[COLLECTION_NAME].find(query)
    docs = await cursor.to_list(length=None) # Get all matching
    return [FileMetadataModel(**doc) for doc in docs]

from typing import Union # for update_file_metadata type hint
