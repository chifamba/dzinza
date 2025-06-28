from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List, Optional, Dict, Any
import uuid
from bson import ObjectId
from datetime import datetime, timezone

from app.models.person_model import PersonModel, NameDetails
from app.schemas.person_schema import PersonCreateSchema, PersonUpdateSchema
from app.models.base_model import PyObjectId
from app.crud import person_history_crud # For logging changes

COLLECTION_NAME = "persons"

async def create_person(db: AsyncIOMotorDatabase, person_data: PersonCreateSchema, user_id: uuid.UUID) -> PersonModel:
    person_dict = person_data.model_dump(exclude_unset=True)
    person_dict["user_id"] = user_id # User who created this record
    person_dict["created_at"] = datetime.now(timezone.utc)
    person_dict["updated_at"] = datetime.now(timezone.utc)

    # Ensure NameDetails is properly handled and generate searchable name
    if "name_details" in person_dict:
        if isinstance(person_dict["name_details"], dict):
            name_obj = NameDetails(**person_dict["name_details"])
        else: # Pydantic model instance
            name_obj = person_dict["name_details"]
        person_dict["name_details"] = name_obj.model_dump() # Store as dict
        person_dict["full_name_searchable"] = name_obj.generate_full_name().lower()
    else: # Default empty NameDetails
        name_obj = NameDetails()
        person_dict["name_details"] = name_obj.model_dump()
        person_dict["full_name_searchable"] = name_obj.generate_full_name().lower()


    result = await db[COLLECTION_NAME].insert_one(person_dict)
    created_person_doc = await db[COLLECTION_NAME].find_one({"_id": result.inserted_id})
    if not created_person_doc:
        return None

    created_person = PersonModel(**created_person_doc)

    # Log creation to history
    await person_history_crud.log_person_change(
        db=db,
        person_id=created_person.id,
        family_tree_id=created_person.family_tree_id,
        changed_by_user_id=user_id,
        action_type="create",
        person_data_snapshot=created_person
    )
    return created_person


async def get_person_by_id(db: AsyncIOMotorDatabase, person_id: PyObjectId) -> Optional[PersonModel]:
    if not isinstance(person_id, ObjectId):
        if ObjectId.is_valid(str(person_id)):
            person_id = ObjectId(str(person_id))
        else:
            return None

    person_doc = await db[COLLECTION_NAME].find_one({"_id": person_id})
    return PersonModel(**person_doc) if person_doc else None

async def get_persons_by_family_tree_id(db: AsyncIOMotorDatabase, family_tree_id: PyObjectId, skip: int = 0, limit: int = 100) -> List[PersonModel]:
    if not isinstance(family_tree_id, ObjectId):
        family_tree_id = ObjectId(str(family_tree_id))

    persons_cursor = db[COLLECTION_NAME].find({"family_tree_id": family_tree_id}).skip(skip).limit(limit)
    persons_list = await persons_cursor.to_list(length=limit)
    return [PersonModel(**person) for person in persons_list]

async def count_persons_in_family_tree(db: AsyncIOMotorDatabase, family_tree_id: PyObjectId) -> int:
    if not isinstance(family_tree_id, ObjectId):
        family_tree_id = ObjectId(str(family_tree_id))
    return await db[COLLECTION_NAME].count_documents({"family_tree_id": family_tree_id})


async def update_person(db: AsyncIOMotorDatabase, person_id: PyObjectId, update_data: PersonUpdateSchema, changed_by_user_id: uuid.UUID) -> Optional[PersonModel]:
    if not isinstance(person_id, ObjectId):
        person_id = ObjectId(str(person_id))

    update_dict = update_data.model_dump(exclude_unset=True)
    if not update_dict: # Nothing to update if empty
        return await get_person_by_id(db, person_id)

    update_dict["updated_at"] = datetime.now(timezone.utc)

    # If name_details are being updated, regenerate full_name_searchable
    if "name_details" in update_dict:
        # Fetch current person to merge name_details if only partial update is provided
        current_person_doc = await db[COLLECTION_NAME].find_one({"_id": person_id})
        if not current_person_doc:
            return None # Person not found

        current_name_details = NameDetails(**current_person_doc.get("name_details", {}))

        if isinstance(update_dict["name_details"], dict):
            updated_name_fields = update_dict["name_details"]
        else: # Pydantic model instance
            updated_name_fields = update_dict["name_details"].model_dump(exclude_unset=True)

        # Merge updated fields into current name details
        merged_name_details_data = current_name_details.model_dump()
        merged_name_details_data.update(updated_name_fields)

        name_obj = NameDetails(**merged_name_details_data)
        update_dict["name_details"] = name_obj.model_dump() # Store as dict
        update_dict["full_name_searchable"] = name_obj.generate_full_name().lower()

    result = await db[COLLECTION_NAME].update_one(
        {"_id": person_id},
        {"$set": update_dict}
    )

    updated_person_doc = await db[COLLECTION_NAME].find_one({"_id": person_id})
    if not updated_person_doc:
        return None

    updated_person = PersonModel(**updated_person_doc)

    # Log update to history
    await person_history_crud.log_person_change(
        db=db,
        person_id=updated_person.id,
        family_tree_id=updated_person.family_tree_id, # Assuming family_tree_id doesn't change
        changed_by_user_id=changed_by_user_id,
        action_type="update",
        person_data_snapshot=updated_person # Snapshot after update
        # TODO: For more detailed history, capture 'changes' (old_value, new_value)
    )
    return updated_person


async def delete_person(db: AsyncIOMotorDatabase, person_id: PyObjectId, changed_by_user_id: uuid.UUID) -> bool:
    if not isinstance(person_id, ObjectId):
        person_id = ObjectId(str(person_id))

    # Before deleting, log the state to history
    person_to_delete = await get_person_by_id(db, person_id)
    if person_to_delete:
        await person_history_crud.log_person_change(
            db=db,
            person_id=person_to_delete.id,
            family_tree_id=person_to_delete.family_tree_id,
            changed_by_user_id=changed_by_user_id,
            action_type="delete",
            person_data_snapshot=person_to_delete # Snapshot before delete
        )
        # Also, deleting a person should handle related relationships.
        # This might involve a cascading delete or unlinking logic.
        # For now, just deleting the person document.
        # Consider soft deletes (is_deleted field) for easier recovery.
        result = await db[COLLECTION_NAME].delete_one({"_id": person_id})
        return result.deleted_count == 1
    return False

# Search function (basic example, can be expanded with more complex queries or Elasticsearch integration)
async def search_persons_by_name(db: AsyncIOMotorDatabase, family_tree_id: PyObjectId, name_query: str, limit: int = 20) -> List[PersonModel]:
    if not isinstance(family_tree_id, ObjectId):
        family_tree_id = ObjectId(str(family_tree_id))

    # Using regex for partial name matching on the denormalized searchable field
    # For more advanced search, MongoDB Atlas Search or Elasticsearch is recommended.
    query = {
        "family_tree_id": family_tree_id,
        "full_name_searchable": {"$regex": name_query, "$options": "i"} # Case-insensitive regex
    }
    persons_cursor = db[COLLECTION_NAME].find(query).limit(limit)
    persons_list = await persons_cursor.to_list(length=limit)
    return [PersonModel(**person) for person in persons_list]

async def get_multiple_persons_by_ids(db: AsyncIOMotorDatabase, person_ids: List[PyObjectId]) -> List[PersonModel]:
    object_ids = []
    for pid in person_ids:
        if not isinstance(pid, ObjectId):
            if ObjectId.is_valid(str(pid)):
                object_ids.append(ObjectId(str(pid)))
        else:
            object_ids.append(pid)

    if not object_ids:
        return []

    persons_cursor = db[COLLECTION_NAME].find({"_id": {"$in": object_ids}})
    persons_list = await persons_cursor.to_list(length=len(object_ids))
    return [PersonModel(**person) for person in persons_list]
