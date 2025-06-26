from motor.motor_asyncio import AsyncIOMotorDatabase
import uuid
from typing import Optional, Dict, Any

from app.crud import notification_crud, user_crud_dummy # user_crud_dummy for fetching user names
from app.schemas.notification_schema import NotificationCreateSchema
from app.models.notification_model import NotificationType
from app.models.family_tree_model import FamilyTreeModel
from app.models.person_model import PersonModel
from app.models.merge_suggestion_model import MergeSuggestionModel
from app.models.base_model import PyObjectId
from app.utils.logger import logger

# Dummy user CRUD to simulate fetching user details (like name for actor_name)
# In a real microservice setup, this might involve an API call to auth-service
# or accessing a replicated/cached user data store.
class UserCrudDummy:
    async def get_user_name_by_id(self, user_id: uuid.UUID) -> Optional[str]:
        # Placeholder: In a real app, fetch from auth service or shared user table
        logger.debug(f"NotificationService: DUMMY fetch for user name with ID: {user_id}")
        # Simulate a lookup
        # if user_id == uuid.UUID("some-known-admin-uuid"): return "Admin User"
        return f"User {str(user_id)[:8]}" # Return a generic name

user_crud_dummy_instance = UserCrudDummy()


async def create_and_send_notification(
    db: AsyncIOMotorDatabase,
    user_id_to_notify: uuid.UUID,
    notification_type: NotificationType,
    message: str,
    title: Optional[str] = None,
    related_entity_type: Optional[str] = None,
    related_entity_id: Optional[Any] = None, # PyObjectId or other ID
    actor_id: Optional[uuid.UUID] = None,
    payload: Optional[Dict[str, Any]] = None
) -> None:
    """
    Helper function to create and potentially send (e.g., push) a notification.
    For now, it just creates it in the database.
    """
    actor_name = None
    if actor_id:
        actor_name = await user_crud_dummy_instance.get_user_name_by_id(actor_id)

    notif_data = NotificationCreateSchema(
        user_id=user_id_to_notify,
        notification_type=notification_type,
        title=title,
        message=message,
        related_entity_type=related_entity_type,
        related_entity_id=str(related_entity_id) if related_entity_id else None, # Ensure ID is stringified if not None
        actor_id=actor_id,
        actor_name=actor_name,
        payload=payload
    )

    try:
        created_notif = await notification_crud.create_notification(db, notification_data=notif_data)
        if created_notif:
            logger.info(f"Notification created for user {user_id_to_notify}: {notification_type.value} - {message[:50]}")
            # TODO: Add push notification logic here if needed (e.g., via WebSockets, FCM, APNS)
        else:
            logger.error(f"Failed to create notification for user {user_id_to_notify}")
    except Exception as e:
        logger.error(f"Error creating notification for user {user_id_to_notify}: {e}", exc_info=True)


# --- Specific Notification Creation Examples ---

async def notify_new_collaborator(db: AsyncIOMotorDatabase, tree: FamilyTreeModel, inviting_user_id: uuid.UUID, new_collaborator_user_id: uuid.UUID):
    inviting_user_name = await user_crud_dummy_instance.get_user_name_by_id(inviting_user_id) or "Someone"
    message = f"{inviting_user_name} has invited you to collaborate on the family tree: '{tree.name}'."
    await create_and_send_notification(
        db,
        user_id_to_notify=new_collaborator_user_id,
        notification_type=NotificationType.NEW_COLLABORATOR,
        title="New Collaboration Invitation",
        message=message,
        related_entity_type="family_tree",
        related_entity_id=tree.id,
        actor_id=inviting_user_id
    )

async def notify_merge_suggestion_received(db: AsyncIOMotorDatabase, suggestion: MergeSuggestionModel, tree_owner_id: uuid.UUID):
    suggester_name = "The system"
    if suggestion.suggester_type == "user" and suggestion.suggester_user_id:
        suggester_name = await user_crud_dummy_instance.get_user_name_by_id(suggestion.suggester_user_id) or "A user"

    person1_name = suggestion.person1_name_preview or f"Person ID {str(suggestion.person1_id)[:8]}"
    person2_name = suggestion.person2_name_preview or f"Person ID {str(suggestion.person2_id)[:8]}"

    message = f"{suggester_name} suggested merging {person1_name} and {person2_name} in your tree."
    await create_and_send_notification(
        db,
        user_id_to_notify=tree_owner_id, # Notify tree owner
        notification_type=NotificationType.MERGE_SUGGESTION_RECEIVED,
        title="New Merge Suggestion",
        message=message,
        related_entity_type="merge_suggestion",
        related_entity_id=suggestion.id,
        actor_id=suggestion.suggester_user_id if suggestion.suggester_type == "user" else None # System has no actor_id here
    )

async def notify_merge_suggestion_resolved(db: AsyncIOMotorDatabase, suggestion: MergeSuggestionModel, reviewer_id: uuid.UUID):
    # Notify the original suggester if it was a user
    if suggestion.suggester_type == "user" and suggestion.suggester_user_id and suggestion.suggester_user_id != reviewer_id:
        reviewer_name = await user_crud_dummy_instance.get_user_name_by_id(reviewer_id) or "A reviewer"
        action = "accepted" if suggestion.status == MergeSuggestionStatus.ACCEPTED else "rejected"

        person1_name = suggestion.person1_name_preview or "Person 1"
        person2_name = suggestion.person2_name_preview or "Person 2"

        message = f"Your merge suggestion for {person1_name} and {person2_name} has been {action} by {reviewer_name}."
        notif_type = NotificationType.MERGE_SUGGESTION_ACCEPTED if action == "accepted" else NotificationType.MERGE_SUGGESTION_REJECTED

        await create_and_send_notification(
            db,
            user_id_to_notify=suggestion.suggester_user_id,
            notification_type=notif_type,
            title=f"Merge Suggestion {action.capitalize()}",
            message=message,
            related_entity_type="merge_suggestion", # Or link to the merged person if accepted
            related_entity_id=suggestion.id if action == "rejected" else suggestion.merged_person_id or suggestion.id,
            actor_id=reviewer_id
        )

# Add more specific notification functions as needed, e.g.:
# - notify_event_reminder (birthdays, anniversaries)
# - notify_system_announcement
# - etc.
