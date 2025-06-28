from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List, Optional, Dict, Any
from bson import ObjectId
from datetime import datetime, timezone

from app.models.relationship_model import RelationshipModel, RelationshipType
from app.schemas.relationship_schema import RelationshipCreateSchema, RelationshipUpdateSchema
from app.models.base_model import PyObjectId

COLLECTION_NAME = "relationships"

async def create_relationship(db: AsyncIOMotorDatabase, relationship_data: RelationshipCreateSchema) -> RelationshipModel:
    rel_dict = relationship_data.model_dump(exclude_unset=True)
    rel_dict["created_at"] = datetime.now(timezone.utc)
    rel_dict["updated_at"] = datetime.now(timezone.utc)

    # Ensure person IDs are ObjectIds
    rel_dict["person1_id"] = ObjectId(str(rel_dict["person1_id"]))
    rel_dict["person2_id"] = ObjectId(str(rel_dict["person2_id"]))
    rel_dict["family_tree_id"] = ObjectId(str(rel_dict["family_tree_id"]))

    # TODO: Add validation to prevent duplicate relationships if necessary
    # e.g., check if a similar relationship (same persons, same type) already exists.
    # This depends on business logic (e.g., can two people have multiple 'marriage' relationships active?)

    result = await db[COLLECTION_NAME].insert_one(rel_dict)
    created_rel_doc = await db[COLLECTION_NAME].find_one({"_id": result.inserted_id})
    return RelationshipModel(**created_rel_doc) if created_rel_doc else None

async def get_relationship_by_id(db: AsyncIOMotorDatabase, relationship_id: PyObjectId) -> Optional[RelationshipModel]:
    if not isinstance(relationship_id, ObjectId):
        if ObjectId.is_valid(str(relationship_id)):
            relationship_id = ObjectId(str(relationship_id))
        else:
            return None

    rel_doc = await db[COLLECTION_NAME].find_one({"_id": relationship_id})
    return RelationshipModel(**rel_doc) if rel_doc else None

async def get_relationships_for_person(db: AsyncIOMotorDatabase, person_id: PyObjectId, family_tree_id: Optional[PyObjectId] = None) -> List[RelationshipModel]:
    if not isinstance(person_id, ObjectId):
        person_id = ObjectId(str(person_id))

    query: Dict[str, Any] = {"$or": [{"person1_id": person_id}, {"person2_id": person_id}]}
    if family_tree_id:
        if not isinstance(family_tree_id, ObjectId):
            family_tree_id = ObjectId(str(family_tree_id))
        query["family_tree_id"] = family_tree_id

    rels_cursor = db[COLLECTION_NAME].find(query)
    rels_list = await rels_cursor.to_list(length=None) # Get all relationships for the person
    return [RelationshipModel(**rel) for rel in rels_list]

async def get_relationships_in_family_tree(db: AsyncIOMotorDatabase, family_tree_id: PyObjectId, skip: int = 0, limit: int = 1000) -> List[RelationshipModel]:
    if not isinstance(family_tree_id, ObjectId):
        family_tree_id = ObjectId(str(family_tree_id))

    rels_cursor = db[COLLECTION_NAME].find({"family_tree_id": family_tree_id}).skip(skip).limit(limit)
    rels_list = await rels_cursor.to_list(length=limit)
    return [RelationshipModel(**rel) for rel in rels_list]


async def update_relationship(db: AsyncIOMotorDatabase, relationship_id: PyObjectId, update_data: RelationshipUpdateSchema) -> Optional[RelationshipModel]:
    if not isinstance(relationship_id, ObjectId):
        relationship_id = ObjectId(str(relationship_id))

    update_dict = update_data.model_dump(exclude_unset=True)
    if not update_dict:
        return await get_relationship_by_id(db, relationship_id)

    update_dict["updated_at"] = datetime.now(timezone.utc)

    result = await db[COLLECTION_NAME].update_one(
        {"_id": relationship_id},
        {"$set": update_dict}
    )
    if result.modified_count == 1:
        updated_rel_doc = await db[COLLECTION_NAME].find_one({"_id": relationship_id})
        return RelationshipModel(**updated_rel_doc) if updated_rel_doc else None

    existing_rel = await db[COLLECTION_NAME].find_one({"_id": relationship_id})
    return RelationshipModel(**existing_rel) if existing_rel else None


async def delete_relationship(db: AsyncIOMotorDatabase, relationship_id: PyObjectId) -> bool:
    if not isinstance(relationship_id, ObjectId):
        relationship_id = ObjectId(str(relationship_id))

    result = await db[COLLECTION_NAME].delete_one({"_id": relationship_id})
    return result.deleted_count == 1

async def delete_relationships_for_person(db: AsyncIOMotorDatabase, person_id: PyObjectId, family_tree_id: Optional[PyObjectId] = None) -> int:
    """Deletes all relationships involving a specific person, optionally within a specific tree."""
    if not isinstance(person_id, ObjectId):
        person_id = ObjectId(str(person_id))

    query: Dict[str, Any] = {"$or": [{"person1_id": person_id}, {"person2_id": person_id}]}
    if family_tree_id:
        if not isinstance(family_tree_id, ObjectId):
            family_tree_id = ObjectId(str(family_tree_id))
        query["family_tree_id"] = family_tree_id

    result = await db[COLLECTION_NAME].delete_many(query)
    return result.deleted_count

async def delete_relationships_in_family_tree(db: AsyncIOMotorDatabase, family_tree_id: PyObjectId) -> int:
    """Deletes all relationships within a specific family tree."""
    if not isinstance(family_tree_id, ObjectId):
        family_tree_id = ObjectId(str(family_tree_id))

    result = await db[COLLECTION_NAME].delete_many({"family_tree_id": family_tree_id})
    return result.deleted_count
