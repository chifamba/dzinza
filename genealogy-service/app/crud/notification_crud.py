from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List, Optional, Dict, Any
import uuid
from bson import ObjectId
from datetime import datetime, timezone

from app.models.notification_model import NotificationModel, NotificationType
from app.schemas.notification_schema import NotificationCreateSchema, NotificationUpdateSchema, MarkNotificationsReadSchema
from app.models.base_model import PyObjectId

COLLECTION_NAME = "notifications"

async def create_notification(db: AsyncIOMotorDatabase, notification_data: NotificationCreateSchema) -> NotificationModel:
    notif_dict = notification_data.model_dump(exclude_unset=True)
    notif_dict["created_at"] = datetime.now(timezone.utc)
    notif_dict["updated_at"] = datetime.now(timezone.utc)
    notif_dict["read"] = False # Explicitly set on creation

    result = await db[COLLECTION_NAME].insert_one(notif_dict)
    created_notif_doc = await db[COLLECTION_NAME].find_one({"_id": result.inserted_id})
    return NotificationModel(**created_notif_doc) if created_notif_doc else None

async def get_notification_by_id(db: AsyncIOMotorDatabase, notification_id: PyObjectId) -> Optional[NotificationModel]:
    if not isinstance(notification_id, ObjectId):
        if ObjectId.is_valid(str(notification_id)):
            notification_id = ObjectId(str(notification_id))
        else:
            return None

    notif_doc = await db[COLLECTION_NAME].find_one({"_id": notification_id})
    return NotificationModel(**notif_doc) if notif_doc else None

async def get_notifications_for_user(
    db: AsyncIOMotorDatabase,
    user_id: uuid.UUID,
    read_status: Optional[bool] = None, # Filter by read status (True=read, False=unread, None=all)
    skip: int = 0,
    limit: int = 20,
    sort_desc: bool = True # Sort by newest first by default
) -> List[NotificationModel]:
    query: Dict[str, Any] = {"user_id": user_id}
    if read_status is not None:
        query["read"] = read_status

    sort_order = -1 if sort_desc else 1

    notifs_cursor = db[COLLECTION_NAME].find(query).sort("created_at", sort_order).skip(skip).limit(limit)
    notifs_list = await notifs_cursor.to_list(length=limit)
    return [NotificationModel(**notif) for notif in notifs_list]

async def count_notifications_for_user(
    db: AsyncIOMotorDatabase,
    user_id: uuid.UUID,
    read_status: Optional[bool] = None
) -> int:
    query: Dict[str, Any] = {"user_id": user_id}
    if read_status is not None:
        query["read"] = read_status
    return await db[COLLECTION_NAME].count_documents(query)


async def mark_notification_as_read_or_unread(
    db: AsyncIOMotorDatabase,
    notification_id: PyObjectId,
    read: bool = True
) -> Optional[NotificationModel]:
    if not isinstance(notification_id, ObjectId):
        notification_id = ObjectId(str(notification_id))

    update_fields: Dict[str, Any] = {
        "read": read,
        "updated_at": datetime.now(timezone.utc)
    }
    if read: # Only set read_at if marking as read
        update_fields["read_at"] = datetime.now(timezone.utc)
    else: # If marking as unread, clear read_at
        update_fields["read_at"] = None
        # Or use {"$unset": {"read_at": ""}} if you want to remove the field

    result = await db[COLLECTION_NAME].update_one(
        {"_id": notification_id},
        {"$set": update_fields}
    )
    if result.modified_count == 1:
        updated_notif_doc = await db[COLLECTION_NAME].find_one({"_id": notification_id})
        return NotificationModel(**updated_notif_doc) if updated_notif_doc else None

    existing_notif = await db[COLLECTION_NAME].find_one({"_id": notification_id})
    return NotificationModel(**existing_notif) if existing_notif else None

async def mark_multiple_notifications_as_read(
    db: AsyncIOMotorDatabase,
    user_id: uuid.UUID,
    notification_ids: List[PyObjectId]
) -> int:
    if not notification_ids:
        return 0

    object_ids = [ObjectId(str(nid)) for nid in notification_ids if ObjectId.is_valid(str(nid))]
    if not object_ids:
        return 0

    result = await db[COLLECTION_NAME].update_many(
        {"_id": {"$in": object_ids}, "user_id": user_id, "read": False}, # Only update unread ones for this user
        {"$set": {"read": True, "read_at": datetime.now(timezone.utc), "updated_at": datetime.now(timezone.utc)}}
    )
    return result.modified_count

async def mark_all_user_notifications_as_read(db: AsyncIOMotorDatabase, user_id: uuid.UUID) -> int:
    result = await db[COLLECTION_NAME].update_many(
        {"user_id": user_id, "read": False}, # Only update unread ones
        {"$set": {"read": True, "read_at": datetime.now(timezone.utc), "updated_at": datetime.now(timezone.utc)}}
    )
    return result.modified_count

async def delete_notification(db: AsyncIOMotorDatabase, notification_id: PyObjectId) -> bool:
    if not isinstance(notification_id, ObjectId):
        notification_id = ObjectId(str(notification_id))

    result = await db[COLLECTION_NAME].delete_one({"_id": notification_id})
    return result.deleted_count == 1

async def delete_all_notifications_for_user(db: AsyncIOMotorDatabase, user_id: uuid.UUID) -> int:
    result = await db[COLLECTION_NAME].delete_many({"user_id": user_id})
    return result.deleted_count
