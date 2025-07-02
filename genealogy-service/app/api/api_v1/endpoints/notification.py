import uuid
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status, Query
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel

from app import models # DB Models (needed for Notification model if not directly from schemas)
from app import schemas # API Schemas (specifically schemas.notification)
from app.crud import crud_notification # CRUD functions
from app.db.base import get_database # DB Dependency
from app.dependencies import AuthenticatedUser, get_current_active_user # Auth Dependency

router = APIRouter()

@router.get("/", response_model=schemas.notification.NotificationList)
async def list_user_notifications(
    *,
    db: AsyncIOMotorDatabase = Depends(get_database),
    read_status: Optional[bool] = Query(None, description="Filter by read status (true=read, false=unread)"),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100), # Default to fewer notifications per page
    current_user: AuthenticatedUser = Depends(get_current_active_user)
):
    """
    Retrieve notifications for the authenticated user.
    Supports pagination and filtering by read status.
    """
    notifications = await crud_notification.get_notifications_for_user(
        db=db, user_id=current_user.id, read_status=read_status, skip=skip, limit=limit
    )
    total_notifications = await crud_notification.count_notifications_for_user(
        db=db, user_id=current_user.id, read_status=read_status # Count should match filter
    )
    unread_count = await crud_notification.count_notifications_for_user(
        db=db, user_id=current_user.id, read_status=False
    )
    return schemas.notification.NotificationList(items=notifications, total=total_notifications, unread_count=unread_count)

class NotificationSummaryResponse(BaseModel): # Using Pydantic BaseModel directly
    total_notifications: int
    unread_notifications: int

@router.get("/summary", response_model=NotificationSummaryResponse)
async def get_notification_summary(
    *,
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: AuthenticatedUser = Depends(get_current_active_user)
):
    """Get a summary of the user's notifications (total and unread count)."""
    total_count = await crud_notification.count_notifications_for_user(db=db, user_id=current_user.id)
    unread_count = await crud_notification.count_notifications_for_user(db=db, user_id=current_user.id, read_status=False)
    return NotificationSummaryResponse(total_notifications=total_count, unread_notifications=unread_count)


@router.patch("/{notification_id}/mark-read", response_model=schemas.notification.NotificationRead)
async def mark_notification_read(
    *,
    db: AsyncIOMotorDatabase = Depends(get_database),
    notification_id: uuid.UUID,
    current_user: AuthenticatedUser = Depends(get_current_active_user)
):
    """
    Mark a specific notification as read.
    """
    updated_notification = await crud_notification.mark_notification_as_read(
        db=db, notification_id=notification_id, user_id=current_user.id
    )
    if not updated_notification:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found or already marked as read.")
    return updated_notification

class MarkAllReadResponse(BaseModel):
    updated_count: int

@router.post("/mark-all-read", response_model=MarkAllReadResponse) # Using POST as it changes state for multiple items
async def mark_all_user_notifications_read(
    *,
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: AuthenticatedUser = Depends(get_current_active_user)
):
    """
    Mark all unread notifications for the authenticated user as read.
    """
    updated_count = await crud_notification.mark_all_notifications_as_read_for_user(db=db, user_id=current_user.id)
    return MarkAllReadResponse(updated_count=updated_count)

@router.delete("/{notification_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user_notification(
    *,
    db: AsyncIOMotorDatabase = Depends(get_database),
    notification_id: uuid.UUID,
    current_user: AuthenticatedUser = Depends(get_current_active_user)
):
    """
    Delete a specific notification for the authenticated user.
    """
    deleted = await crud_notification.delete_notification(
        db=db, notification_id=notification_id, user_id=current_user.id
    )
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found or not owned by user.")
    return None # FastAPI returns 204

class DeleteAllResponse(BaseModel):
    deleted_count: int

@router.delete("/all", response_model=DeleteAllResponse) # Changed from "/all/" to "/all"
async def delete_all_user_notifications(
    *,
    db: AsyncIOMotorDatabase = Depends(get_database),
    only_read: Optional[bool] = Query(None, description="If true, only delete read notifications. If false, only unread. If null, delete all."),
    current_user: AuthenticatedUser = Depends(get_current_active_user)
):
    """
    Delete notifications for the authenticated user.
    Can be scoped to all, only read, or only unread notifications.
    """
    deleted_count = await crud_notification.delete_all_notifications_for_user(
        db=db, user_id=current_user.id, only_read=only_read
    )
    return DeleteAllResponse(deleted_count=deleted_count)
