from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List, Optional, Dict, Any
import uuid
from bson import ObjectId

from app.models.family_tree_model import FamilyTreeModel
from app.schemas.family_tree_schema import FamilyTreeCreateSchema, FamilyTreeUpdateSchema
from app.models.base_model import PyObjectId # For type hinting if needed
from datetime import datetime, timezone

COLLECTION_NAME = "family_trees"

async def create_family_tree(db: AsyncIOMotorDatabase, tree_data: FamilyTreeCreateSchema, owner_id: uuid.UUID) -> FamilyTreeModel:
    tree_dict = tree_data.model_dump(exclude_unset=True)
    tree_dict["owner_id"] = owner_id # Set by system
    tree_dict["created_at"] = datetime.now(timezone.utc)
    tree_dict["updated_at"] = datetime.now(timezone.utc)

    # Ensure privacy_settings is a dict if provided, or default
    if "privacy_settings" not in tree_dict or tree_dict["privacy_settings"] is None:
        tree_dict["privacy_settings"] = FamilyTreeModel().privacy_settings.model_dump()
    elif isinstance(tree_dict["privacy_settings"], dict):
        pass # Already a dict
    else: # It's a Pydantic model instance
        tree_dict["privacy_settings"] = tree_dict["privacy_settings"].model_dump()


    result = await db[COLLECTION_NAME].insert_one(tree_dict)
    created_tree = await db[COLLECTION_NAME].find_one({"_id": result.inserted_id})
    return FamilyTreeModel(**created_tree) if created_tree else None

async def get_family_tree_by_id(db: AsyncIOMotorDatabase, tree_id: PyObjectId) -> Optional[FamilyTreeModel]:
    if not isinstance(tree_id, ObjectId): # Ensure it's an ObjectId for query
        if ObjectId.is_valid(str(tree_id)):
            tree_id = ObjectId(str(tree_id))
        else:
            return None # Invalid ID format

    tree_doc = await db[COLLECTION_NAME].find_one({"_id": tree_id})
    return FamilyTreeModel(**tree_doc) if tree_doc else None

async def get_family_trees_by_owner_id(db: AsyncIOMotorDatabase, owner_id: uuid.UUID, skip: int = 0, limit: int = 100) -> List[FamilyTreeModel]:
    trees_cursor = db[COLLECTION_NAME].find({"owner_id": owner_id}).skip(skip).limit(limit)
    trees_list = await trees_cursor.to_list(length=limit)
    return [FamilyTreeModel(**tree) for tree in trees_list]

async def get_family_trees_by_collaborator_id(db: AsyncIOMotorDatabase, user_id: uuid.UUID, skip: int = 0, limit: int = 100) -> List[FamilyTreeModel]:
    trees_cursor = db[COLLECTION_NAME].find({"collaborator_ids": user_id}).skip(skip).limit(limit)
    trees_list = await trees_cursor.to_list(length=limit)
    return [FamilyTreeModel(**tree) for tree in trees_list]


async def update_family_tree(db: AsyncIOMotorDatabase, tree_id: PyObjectId, update_data: FamilyTreeUpdateSchema) -> Optional[FamilyTreeModel]:
    if not isinstance(tree_id, ObjectId):
        tree_id = ObjectId(str(tree_id))

    update_dict = update_data.model_dump(exclude_unset=True)
    update_dict["updated_at"] = datetime.now(timezone.utc)

    # Handle nested privacy_settings update carefully
    if "privacy_settings" in update_dict and update_dict["privacy_settings"] is not None:
        # Ensure privacy_settings is a dict for MongoDB update
        if not isinstance(update_dict["privacy_settings"], dict):
             update_dict["privacy_settings"] = update_dict["privacy_settings"].model_dump(exclude_unset=True)

        # To update specific fields within privacy_settings, use dot notation or fetch and merge
        # For simplicity, this replaces the whole privacy_settings object if provided.
        # For partial updates of nested objects:
        # privacy_update = {}
        # for key, value in update_dict["privacy_settings"].items():
        #     privacy_update[f"privacy_settings.{key}"] = value
        # del update_dict["privacy_settings"] # remove from top level
        # update_dict.update(privacy_update) # add dotted fields
        pass # Current approach replaces the whole sub-document

    if not update_dict: # Nothing to update if only updated_at is there
        return await get_family_tree_by_id(db, tree_id)

    result = await db[COLLECTION_NAME].update_one(
        {"_id": tree_id},
        {"$set": update_dict}
    )
    if result.modified_count == 1:
        updated_tree = await db[COLLECTION_NAME].find_one({"_id": tree_id})
        return FamilyTreeModel(**updated_tree) if updated_tree else None
    # If modified_count is 0, it could be that data is same or tree not found
    # Check if tree exists if modified_count is 0
    existing_tree = await db[COLLECTION_NAME].find_one({"_id": tree_id})
    return FamilyTreeModel(**existing_tree) if existing_tree else None


async def delete_family_tree(db: AsyncIOMotorDatabase, tree_id: PyObjectId) -> bool:
    if not isinstance(tree_id, ObjectId):
        tree_id = ObjectId(str(tree_id))
    # Note: Deleting a family tree should also handle deletion of associated persons, relationships, etc.
    # This is a complex operation that might involve transactions (if supported and configured)
    # or a multi-step process. For now, just deleting the tree document.
    # Consider adding a 'deleted_at' field for soft deletes.
    result = await db[COLLECTION_NAME].delete_one({"_id": tree_id})
    return result.deleted_count == 1

async def add_collaborator_to_tree(db: AsyncIOMotorDatabase, tree_id: PyObjectId, collaborator_user_id: uuid.UUID) -> bool:
    if not isinstance(tree_id, ObjectId):
        tree_id = ObjectId(str(tree_id))

    result = await db[COLLECTION_NAME].update_one(
        {"_id": tree_id},
        {"$addToSet": {"collaborator_ids": collaborator_user_id}, "$set": {"updated_at": datetime.now(timezone.utc)}}
    )
    return result.modified_count == 1

async def remove_collaborator_from_tree(db: AsyncIOMotorDatabase, tree_id: PyObjectId, collaborator_user_id: uuid.UUID) -> bool:
    if not isinstance(tree_id, ObjectId):
        tree_id = ObjectId(str(tree_id))

    result = await db[COLLECTION_NAME].update_one(
        {"_id": tree_id},
        {"$pull": {"collaborator_ids": collaborator_user_id}, "$set": {"updated_at": datetime.now(timezone.utc)}}
    )
    return result.modified_count == 1

async def count_family_trees_by_owner(db: AsyncIOMotorDatabase, owner_id: uuid.UUID) -> int:
    return await db[COLLECTION_NAME].count_documents({"owner_id": owner_id})

async def count_family_trees_by_collaborator(db: AsyncIOMotorDatabase, user_id: uuid.UUID) -> int:
    return await db[COLLECTION_NAME].count_documents({"collaborator_ids": user_id})

async def update_member_count(db: AsyncIOMotorDatabase, tree_id: PyObjectId, increment: int = 1) -> bool:
    if not isinstance(tree_id, ObjectId):
        tree_id = ObjectId(str(tree_id))
    result = await db[COLLECTION_NAME].update_one(
        {"_id": tree_id},
        {"$inc": {"member_count": increment}, "$set": {"updated_at": datetime.now(timezone.utc)}}
    )
    return result.modified_count == 1
