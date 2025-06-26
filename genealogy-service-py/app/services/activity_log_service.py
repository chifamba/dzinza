from motor.motor_asyncio import AsyncIOMotorDatabase
import uuid
from typing import Optional, Dict, Any
from datetime import datetime, timezone

from app.models.base_model import PyObjectId
from app.utils.logger import logger

# This service is a placeholder. The original Node.js service had an activityLogService.ts.
# Its exact responsibilities need to be clarified.
# - Is it for general audit logging beyond person history?
# - Does it feed into notifications or a separate activity feed?

# For now, let's assume it logs significant actions.
# This might involve creating a new MongoDB collection e.g., "activity_logs".

# Example Activity Log Entry Structure (if stored in a dedicated collection)
# class ActivityLogEntry(BaseModel):
#     id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
#     timestamp: datetime = Field(default_factory=datetime.utcnow)
#     user_id: Optional[uuid.UUID] = None # User performing the action
#     action_type: str # e.g., "FAMILY_TREE_CREATED", "PERSON_UPDATED", "COLLABORATOR_ADDED"
#     family_tree_id: Optional[PyObjectId] = None # Context
#     target_entity_type: Optional[str] = None # e.g., "person", "relationship", "family_tree"
#     target_entity_id: Optional[Any] = None
#     details: Optional[Dict[str, Any]] = None # e.g., changed fields, summary
#     ip_address: Optional[str] = None # If tracking IP


async def log_activity(
    db: AsyncIOMotorDatabase, # Assuming it might write to a dedicated collection
    user_id: Optional[uuid.UUID],
    action_type: str,
    family_tree_id: Optional[PyObjectId] = None,
    target_entity_type: Optional[str] = None,
    target_entity_id: Optional[Any] = None,
    details: Optional[Dict[str, Any]] = None
):
    """
    Logs a generic activity.
    This is a placeholder. A full implementation would define the schema for activity logs
    and store them in a dedicated collection.
    Person history is already handled by person_history_crud. This might be for other types of logs.
    """
    log_message = (
        f"Activity Logged: User '{str(user_id)[:8] if user_id else 'System'}' "
        f"performed action '{action_type}'"
    )
    if family_tree_id:
        log_message += f" on tree '{str(family_tree_id)}'"
    if target_entity_type and target_entity_id:
        log_message += f" targeting {target_entity_type} '{str(target_entity_id)}'"
    if details:
        log_message += f" with details: {details}"

    logger.info(log_message) # For now, just log to standard logger

    # Example: Storing to a collection (if activity_logs collection exists)
    # activity_entry = {
    #     "timestamp": datetime.now(timezone.utc),
    #     "user_id": user_id,
    #     "action_type": action_type,
    #     "family_tree_id": ObjectId(str(family_tree_id)) if family_tree_id else None,
    #     "target_entity_type": target_entity_type,
    #     "target_entity_id": str(target_entity_id) if target_entity_id else None, # Or store as correct type
    #     "details": details,
    #     # "ip_address": request.client.host (if request object is available)
    # }
    # await db["activity_logs"].insert_one(activity_entry)


# Example specific logging functions that might use the generic log_activity

async def log_family_tree_creation(db: AsyncIOMotorDatabase, user_id: uuid.UUID, tree_id: PyObjectId, tree_name: str):
    await log_activity(
        db, user_id=user_id, action_type="FAMILY_TREE_CREATED",
        family_tree_id=tree_id, target_entity_type="family_tree", target_entity_id=tree_id,
        details={"name": tree_name}
    )

async def log_collaborator_added(db: AsyncIOMotorDatabase, inviter_id: uuid.UUID, invitee_id: uuid.UUID, tree_id: PyObjectId):
    await log_activity(
        db, user_id=inviter_id, action_type="COLLABORATOR_ADDED",
        family_tree_id=tree_id, target_entity_type="user", target_entity_id=invitee_id,
        details={"invited_user_id": str(invitee_id)}
    )

# The PersonHistoryModel and its CRUD already provide detailed change logging for persons.
# This activity_log_service might be for higher-level actions or non-person entities,
# or if a unified activity stream is desired separate from detailed history.
# For now, it's a simple logger wrapper. It can be expanded if specific requirements for an
# "activity_logs" collection emerge.
