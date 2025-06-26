from fastapi import APIRouter, Depends, HTTPException, status, Query
from motor.motor_asyncio import AsyncIOMotorDatabase
import uuid # For user_id
from typing import List, Optional

from app.db.database import get_db_dependency
from app.crud import notification_crud
from app.schemas import notification_schema, PaginatedResponse
from app.models.base_model import PyObjectId
from app.middleware.auth_middleware import get_current_active_user_id_dependency
from app.utils.logger import logger


CurrentUserUUID = Depends(get_current_active_user_id_dependency)

router = APIRouter()

@router.get("/", response_model=PaginatedResponse[notification_schema.NotificationResponseSchema])
async def get_my_notifications(
    db: AsyncIOMotorDatabase = Depends(get_db_dependency),
    current_user_id: uuid.UUID = CurrentUserUUID,
    read_status: Optional[bool] = Query(None, description="Filter by read status (true=read, false=unread)"),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100)
):
    skip = (page - 1) * size
    notifications = await notification_crud.get_notifications_for_user(
        db, user_id=current_user_id, read_status=read_status, skip=skip, limit=size
    )
    total_notifications = await notification_crud.count_notifications_for_user(
        db, user_id=current_user_id, read_status=read_status
    )
    return PaginatedResponse(items=notifications, total=total_notifications, page=page, size=size)

@router.post("/mark-read", status_code=status.HTTP_200_OK)
async def mark_notifications_as_read(
    data: notification_schema.MarkNotificationsReadSchema,
    db: AsyncIOMotorDatabase = Depends(get_db_dependency),
    current_user_id: uuid.UUID = CurrentUserUUID
):
    modified_count = 0
    if data.mark_all_as_read:
        modified_count = await notification_crud.mark_all_user_notifications_as_read(db, user_id=current_user_id)
    elif data.notification_ids:
        modified_count = await notification_crud.mark_multiple_notifications_as_read(db, user_id=current_user_id, notification_ids=data.notification_ids)
    else:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No notifications specified to mark as read.")

    return {"message": f"{modified_count} notification(s) marked as read."}


@router.put("/{notification_id}/read", response_model=notification_schema.NotificationResponseSchema)
async def mark_single_notification_read(
    notification_id: PyObjectId,
    db: AsyncIOMotorDatabase = Depends(get_db_dependency),
    current_user_id: uuid.UUID = CurrentUserUUID
):
    notif = await notification_crud.get_notification_by_id(db, notification_id=notification_id)
    if not notif or notif.user_id != current_user_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found or not authorized.")

    updated_notif = await notification_crud.mark_notification_as_read_or_unread(db, notification_id=notification_id, read=True)
    if not updated_notif:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found or update failed.")
    return updated_notif

@router.put("/{notification_id}/unread", response_model=notification_schema.NotificationResponseSchema)
async def mark_single_notification_unread(
    notification_id: PyObjectId,
    db: AsyncIOMotorDatabase = Depends(get_db_dependency),
    current_user_id: uuid.UUID = CurrentUserUUID
):
    notif = await notification_crud.get_notification_by_id(db, notification_id=notification_id)
    if not notif or notif.user_id != current_user_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found or not authorized.")

    updated_notif = await notification_crud.mark_notification_as_read_or_unread(db, notification_id=notification_id, read=False)
    if not updated_notif:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found or update failed.")
    return updated_notif

@router.delete("/{notification_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_notification(
    notification_id: PyObjectId,
    db: AsyncIOMotorDatabase = Depends(get_db_dependency),
    current_user_id: uuid.UUID = CurrentUserUUID
):
    notif = await notification_crud.get_notification_by_id(db, notification_id=notification_id)
    if not notif or notif.user_id != current_user_id:
        # Allow deletion even if not found to make client logic simpler (idempotent)
        # Or raise 404 if strict:
        # raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found or not authorized.")
        return Response(status_code=status.HTTP_204_NO_CONTENT)


    deleted = await notification_crud.delete_notification(db, notification_id=notification_id)
    if not deleted:
        # This might happen if already deleted by another request
        pass # Still return 204

    return Response(status_code=status.HTTP_204_NO_CONTENT)

@router.delete("/", status_code=status.HTTP_200_OK) # Delete all for user
async def delete_all_my_notifications(
    db: AsyncIOMotorDatabase = Depends(get_db_dependency),
    current_user_id: uuid.UUID = CurrentUserUUID
):
    deleted_count = await notification_crud.delete_all_notifications_for_user(db, user_id=current_user_id)
    return {"message": f"{deleted_count} notification(s) deleted."}

from fastapi import Response # For 204 status code return type. Already imported.
