from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List, Optional, Dict, Any
import uuid
from bson import ObjectId
from datetime import datetime, timezone

from app.models.merge_suggestion_model import MergeSuggestionModel, MergeSuggestionStatus
from app.schemas.merge_suggestion_schema import MergeSuggestionCreateSchema, MergeSuggestionUpdateSchema
from app.models.base_model import PyObjectId

COLLECTION_NAME = "merge_suggestions"

async def create_merge_suggestion(db: AsyncIOMotorDatabase, suggestion_data: MergeSuggestionCreateSchema, suggester_type: str = "system", suggester_user_id: Optional[uuid.UUID] = None) -> MergeSuggestionModel:
    suggestion_dict = suggestion_data.model_dump(exclude_unset=True)
    suggestion_dict["created_at"] = datetime.now(timezone.utc)
    suggestion_dict["updated_at"] = datetime.now(timezone.utc)
    suggestion_dict["status"] = MergeSuggestionStatus.PENDING # Default status
    suggestion_dict["suggester_type"] = suggester_type
    if suggester_user_id:
        suggestion_dict["suggester_user_id"] = suggester_user_id

    # Ensure ObjectIds
    suggestion_dict["family_tree_id"] = ObjectId(str(suggestion_dict["family_tree_id"]))
    suggestion_dict["person1_id"] = ObjectId(str(suggestion_dict["person1_id"]))
    suggestion_dict["person2_id"] = ObjectId(str(suggestion_dict["person2_id"]))

    # TODO: Add logic to fetch person1_name_preview and person2_name_preview
    # from the persons collection based on person1_id and person2_id.
    # This denormalization helps in listing suggestions without extra lookups.
    # Example:
    # from app.crud.person_crud import get_person_by_id
    # person1 = await get_person_by_id(db, suggestion_dict["person1_id"])
    # person2 = await get_person_by_id(db, suggestion_dict["person2_id"])
    # if person1: suggestion_dict["person1_name_preview"] = person1.name_details.generate_full_name()
    # if person2: suggestion_dict["person2_name_preview"] = person2.name_details.generate_full_name()


    result = await db[COLLECTION_NAME].insert_one(suggestion_dict)
    created_suggestion_doc = await db[COLLECTION_NAME].find_one({"_id": result.inserted_id})
    return MergeSuggestionModel(**created_suggestion_doc) if created_suggestion_doc else None

async def get_merge_suggestion_by_id(db: AsyncIOMotorDatabase, suggestion_id: PyObjectId) -> Optional[MergeSuggestionModel]:
    if not isinstance(suggestion_id, ObjectId):
        if ObjectId.is_valid(str(suggestion_id)):
            suggestion_id = ObjectId(str(suggestion_id))
        else:
            return None

    suggestion_doc = await db[COLLECTION_NAME].find_one({"_id": suggestion_id})
    return MergeSuggestionModel(**suggestion_doc) if suggestion_doc else None

async def get_merge_suggestions_for_family_tree(
    db: AsyncIOMotorDatabase,
    family_tree_id: PyObjectId,
    status: Optional[MergeSuggestionStatus] = None,
    skip: int = 0,
    limit: int = 20
) -> List[MergeSuggestionModel]:
    if not isinstance(family_tree_id, ObjectId):
        family_tree_id = ObjectId(str(family_tree_id))

    query: Dict[str, Any] = {"family_tree_id": family_tree_id}
    if status:
        query["status"] = status.value # Use enum value for query

    suggestions_cursor = db[COLLECTION_NAME].find(query).sort("created_at", -1).skip(skip).limit(limit)
    suggestions_list = await suggestions_cursor.to_list(length=limit)
    return [MergeSuggestionModel(**suggestion) for suggestion in suggestions_list]

async def count_merge_suggestions_for_family_tree(
    db: AsyncIOMotorDatabase,
    family_tree_id: PyObjectId,
    status: Optional[MergeSuggestionStatus] = None
) -> int:
    if not isinstance(family_tree_id, ObjectId):
        family_tree_id = ObjectId(str(family_tree_id))
    query: Dict[str, Any] = {"family_tree_id": family_tree_id}
    if status:
        query["status"] = status.value
    return await db[COLLECTION_NAME].count_documents(query)


async def update_merge_suggestion_status(
    db: AsyncIOMotorDatabase,
    suggestion_id: PyObjectId,
    update_data: MergeSuggestionUpdateSchema,
    reviewer_user_id: uuid.UUID
) -> Optional[MergeSuggestionModel]:
    if not isinstance(suggestion_id, ObjectId):
        suggestion_id = ObjectId(str(suggestion_id))

    update_dict = update_data.model_dump(exclude_unset=True)
    if not update_dict: # Nothing to update if only updated_at is there
        return await get_merge_suggestion_by_id(db, suggestion_id)

    update_dict["updated_at"] = datetime.now(timezone.utc)
    update_dict["reviewer_user_id"] = reviewer_user_id
    update_dict["reviewed_at"] = datetime.now(timezone.utc)

    # If status is being set, ensure it's the enum's value
    if "status" in update_dict and isinstance(update_dict["status"], MergeSuggestionStatus):
        update_dict["status"] = update_dict["status"].value

    # If status is 'accepted', potentially set merged_person_id and archived_person_id
    # This logic would typically be in a service layer after performing the actual merge.
    # For now, this CRUD just updates the fields provided.
    # if update_dict.get("status") == MergeSuggestionStatus.ACCEPTED.value:
    #     # update_dict["merged_person_id"] = ...
    #     # update_dict["archived_person_id"] = ...
    #     pass


    result = await db[COLLECTION_NAME].update_one(
        {"_id": suggestion_id},
        {"$set": update_dict}
    )
    if result.modified_count == 1:
        updated_suggestion_doc = await db[COLLECTION_NAME].find_one({"_id": suggestion_id})
        return MergeSuggestionModel(**updated_suggestion_doc) if updated_suggestion_doc else None

    existing_suggestion = await db[COLLECTION_NAME].find_one({"_id": suggestion_id})
    return MergeSuggestionModel(**existing_suggestion) if existing_suggestion else None

async def delete_merge_suggestion(db: AsyncIOMotorDatabase, suggestion_id: PyObjectId) -> bool:
    if not isinstance(suggestion_id, ObjectId):
        suggestion_id = ObjectId(str(suggestion_id))

    result = await db[COLLECTION_NAME].delete_one({"_id": suggestion_id})
    return result.deleted_count == 1

async def find_existing_suggestion(
    db: AsyncIOMotorDatabase,
    family_tree_id: PyObjectId,
    person1_id: PyObjectId,
    person2_id: PyObjectId,
    exclude_statuses: Optional[List[MergeSuggestionStatus]] = None
) -> Optional[MergeSuggestionModel]:
    """Checks if a similar merge suggestion (between same two people) already exists."""
    if not isinstance(family_tree_id, ObjectId): family_tree_id = ObjectId(str(family_tree_id))
    if not isinstance(person1_id, ObjectId): person1_id = ObjectId(str(person1_id))
    if not isinstance(person2_id, ObjectId): person2_id = ObjectId(str(person2_id))

    # Check for both (p1, p2) and (p2, p1) combinations
    query: Dict[str, Any] = {
        "family_tree_id": family_tree_id,
        "$or": [
            {"person1_id": person1_id, "person2_id": person2_id},
            {"person1_id": person2_id, "person2_id": person1_id},
        ]
    }
    if exclude_statuses:
        query["status"] = {"$nin": [status.value for status in exclude_statuses]}

    suggestion_doc = await db[COLLECTION_NAME].find_one(query)
    return MergeSuggestionModel(**suggestion_doc) if suggestion_doc else None
