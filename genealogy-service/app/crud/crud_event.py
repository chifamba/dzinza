import uuid
from datetime import datetime
from typing import List, Optional

from motor.motor_asyncio import AsyncIOMotorDatabase
from pymongo import ReturnDocument

from app.models import Event # DB Model
from app.schemas.event import EventCreateData, EventUpdateData # API Schemas
from app.db.base import EVENTS_COLLECTION

async def create_event(
    db: AsyncIOMotorDatabase, *, tree_id: uuid.UUID, event_in: EventCreateData
) -> Event:
    """
    Create a new event within a specific family tree.
    An event can be linked to a primary person, a secondary person, or a relationship.
    """
    collection = db[EVENTS_COLLECTION]
    now = datetime.utcnow()

    db_event = Event(
        **event_in.model_dump(exclude_unset=True),
        tree_id=tree_id, # tree_id is mandatory for an event context
        created_at=now,
        updated_at=now
    )

    # Validate linked entities if necessary (e.g., do persons/relationship exist in this tree?)
    # This might be better handled at the API layer or service layer before calling CRUD.

    await collection.insert_one(db_event.model_dump(by_alias=True))
    return db_event

async def get_event_by_id(
    db: AsyncIOMotorDatabase, *, event_id: uuid.UUID, tree_id: Optional[uuid.UUID] = None
) -> Optional[Event]:
    """
    Get an event by its ID.
    Optionally ensure it belongs to a specific tree_id.
    """
    collection = db[EVENTS_COLLECTION]
    query = {"_id": event_id}
    if tree_id:
        query["tree_id"] = tree_id

    doc = await collection.find_one(query)
    return Event(**doc) if doc else None

async def get_events_for_person(
    db: AsyncIOMotorDatabase, *, person_id: uuid.UUID, tree_id: Optional[uuid.UUID] = None,
    skip: int = 0, limit: int = 100
) -> List[Event]:
    """
    Get all events where the given person is either the primary or secondary person.
    Can be filtered by tree_id.
    """
    collection = db[EVENTS_COLLECTION]
    query: dict = {
        "$or": [
            {"primary_person_id": person_id},
            {"secondary_person_id": person_id}
        ]
    }
    if tree_id:
        query["tree_id"] = tree_id

    events = []
    cursor = collection.find(query).sort([("date_exact", 1), ("created_at", 1)]).skip(skip).limit(limit) # Sort by date
    async for doc in cursor:
        events.append(Event(**doc))
    return events

async def get_events_for_relationship(
    db: AsyncIOMotorDatabase, *, relationship_id: uuid.UUID, tree_id: Optional[uuid.UUID] = None,
    skip: int = 0, limit: int = 100
) -> List[Event]:
    """
    Get all events linked to a specific relationship.
    Can be filtered by tree_id.
    """
    collection = db[EVENTS_COLLECTION]
    query: dict = {"relationship_id": relationship_id}
    if tree_id:
        query["tree_id"] = tree_id

    events = []
    cursor = collection.find(query).sort([("date_exact", 1), ("created_at", 1)]).skip(skip).limit(limit)
    async for doc in cursor:
        events.append(Event(**doc))
    return events

async def get_events_for_tree(
    db: AsyncIOMotorDatabase, *, tree_id: uuid.UUID,
    event_type: Optional[str] = None, # Filter by models.EventType
    skip: int = 0, limit: int = 100
) -> List[Event]:
    """Get all events for a specific tree, optionally filtered by event_type."""
    collection = db[EVENTS_COLLECTION]
    query: dict = {"tree_id": tree_id}
    if event_type:
        query["event_type"] = event_type

    events = []
    cursor = collection.find(query).sort([("date_exact", 1), ("created_at", 1)]).skip(skip).limit(limit)
    async for doc in cursor:
        events.append(Event(**doc))
    return events

async def count_events_for_tree(
    db: AsyncIOMotorDatabase, *, tree_id: uuid.UUID, event_type: Optional[str] = None
) -> int:
    """Counts events for a specific tree, optionally filtered by event_type."""
    collection = db[EVENTS_COLLECTION]
    query: dict = {"tree_id": tree_id}
    if event_type:
        query["event_type"] = event_type
    return await collection.count_documents(query)


async def update_event(
    db: AsyncIOMotorDatabase, *, event_id: uuid.UUID, event_in: EventUpdateData,
    tree_id: Optional[uuid.UUID] = None # To ensure update is within the correct tree context
) -> Optional[Event]:
    """
    Update an existing event.
    """
    collection = db[EVENTS_COLLECTION]

    update_data = event_in.model_dump(exclude_unset=True)
    if not update_data:
        return await get_event_by_id(db, event_id=event_id, tree_id=tree_id)

    update_data["updated_at"] = datetime.utcnow()

    query = {"_id": event_id}
    if tree_id: # Important for scoped updates
        query["tree_id"] = tree_id

    updated_doc = await collection.find_one_and_update(
        query,
        {"$set": update_data},
        return_document=ReturnDocument.AFTER
    )
    return Event(**updated_doc) if updated_doc else None

async def delete_event(
    db: AsyncIOMotorDatabase, *, event_id: uuid.UUID, tree_id: Optional[uuid.UUID] = None
) -> bool:
    """
    Delete an event by its ID.
    Optionally ensure it belongs to a specific tree_id before deletion.
    """
    collection = db[EVENTS_COLLECTION]
    query = {"_id": event_id}
    if tree_id:
        query["tree_id"] = tree_id

    result = await collection.delete_one(query)
    return result.deleted_count > 0
