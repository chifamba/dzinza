from fastapi import APIRouter, Depends, HTTPException, status, Query
from motor.motor_asyncio import AsyncIOMotorDatabase
import uuid # For user_id
from typing import List, Optional

from app.db.database import get_db_dependency
from app.crud import merge_suggestion_crud, person_crud, family_tree_crud
from app.schemas import merge_suggestion_schema, PaginatedResponse
from app.models.base_model import PyObjectId
from app.models.merge_suggestion_model import MergeSuggestionStatus
from app.middleware.auth_middleware import get_current_active_user_id_dependency
from app.api.v1.person_router import get_authorized_family_tree # Reuse helper for tree auth
from app.crud.family_tree_crud import FamilyTreeModel # For type hint
from app.utils.logger import logger


CurrentUserUUID = Depends(get_current_active_user_id_dependency)

router = APIRouter()

# Note: Creation of merge suggestions might be a system-internal process (e.g., duplicate detection task)
# or allow users to suggest merges. For now, assuming an endpoint for manual suggestion creation.
@router.post("/", response_model=merge_suggestion_schema.MergeSuggestionResponseSchema, status_code=status.HTTP_201_CREATED)
async def create_merge_suggestion(
    suggestion_in: merge_suggestion_schema.MergeSuggestionCreateSchema,
    db: AsyncIOMotorDatabase = Depends(get_db_dependency),
    current_user_id: uuid.UUID = CurrentUserUUID
):
    # Authorize access to the family tree
    family_tree = await get_authorized_family_tree(suggestion_in.family_tree_id, db, current_user_id)
    # TODO: Check if user has permissions to suggest merges (e.g., owner or editor)

    # Validate persons exist in this tree
    person1 = await person_crud.get_person_by_id(db, person_id=suggestion_in.person1_id)
    person2 = await person_crud.get_person_by_id(db, person_id=suggestion_in.person2_id)
    if not person1 or str(person1.family_tree_id) != str(family_tree.id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Person1 (ID: {suggestion_in.person1_id}) not found in tree.")
    if not person2 or str(person2.family_tree_id) != str(family_tree.id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Person2 (ID: {suggestion_in.person2_id}) not found in tree.")

    if person1.id == person2.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot suggest merging a person with themselves.")

    # Check if an active suggestion already exists
    existing_suggestion = await merge_suggestion_crud.find_existing_suggestion(
        db, family_tree_id=family_tree.id, person1_id=person1.id, person2_id=person2.id,
        exclude_statuses=[MergeSuggestionStatus.ACCEPTED, MergeSuggestionStatus.REJECTED, MergeSuggestionStatus.CANCELLED]
    )
    if existing_suggestion:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="A similar merge suggestion already exists and is pending.")

    # Populate name previews (should ideally be in CRUD or service layer)
    suggestion_create_data = suggestion_in.model_copy(deep=True) # Pydantic v2
    # suggestion_create_data = suggestion_in.copy(deep=True) # Pydantic v1

    # This part should be in the CRUD for atomicity or service layer
    # suggestion_create_data.person1_name_preview = person1.name_details.generate_full_name()
    # suggestion_create_data.person2_name_preview = person2.name_details.generate_full_name()


    created_suggestion = await merge_suggestion_crud.create_merge_suggestion(
        db,
        suggestion_data=suggestion_create_data,
        suggester_type="user",
        suggester_user_id=current_user_id
    )
    if not created_suggestion:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to create merge suggestion.")

    # TODO: Create notification for tree owner/admins about new suggestion
    return created_suggestion


@router.get("/by-tree/{family_tree_id}", response_model=PaginatedResponse[merge_suggestion_schema.MergeSuggestionResponseSchema])
async def list_merge_suggestions_for_tree(
    family_tree: FamilyTreeModel = Depends(get_authorized_family_tree),
    db: AsyncIOMotorDatabase = Depends(get_db_dependency),
    status: Optional[MergeSuggestionStatus] = Query(None, description="Filter by status"),
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=50)
):
    skip = (page - 1) * size
    suggestions = await merge_suggestion_crud.get_merge_suggestions_for_family_tree(
        db, family_tree_id=family_tree.id, status=status, skip=skip, limit=size
    )
    total_suggestions = await merge_suggestion_crud.count_merge_suggestions_for_family_tree(
        db, family_tree_id=family_tree.id, status=status
    )
    return PaginatedResponse(items=suggestions, total=total_suggestions, page=page, size=size)

@router.get("/{suggestion_id}", response_model=merge_suggestion_schema.MergeSuggestionResponseSchema)
async def get_merge_suggestion_details(
    suggestion_id: PyObjectId,
    db: AsyncIOMotorDatabase = Depends(get_db_dependency),
    current_user_id: uuid.UUID = CurrentUserUUID
):
    suggestion = await merge_suggestion_crud.get_merge_suggestion_by_id(db, suggestion_id=suggestion_id)
    if not suggestion:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Merge suggestion not found.")

    # Authorize access via the suggestion's family tree
    await get_authorized_family_tree(suggestion.family_tree_id, db, current_user_id)
    return suggestion

@router.put("/{suggestion_id}/review", response_model=merge_suggestion_schema.MergeSuggestionResponseSchema)
async def review_merge_suggestion(
    suggestion_id: PyObjectId,
    review_data: merge_suggestion_schema.MergeSuggestionUpdateSchema, # Contains new status and notes
    db: AsyncIOMotorDatabase = Depends(get_db_dependency),
    current_user_id: uuid.UUID = CurrentUserUUID
):
    suggestion = await merge_suggestion_crud.get_merge_suggestion_by_id(db, suggestion_id=suggestion_id)
    if not suggestion:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Merge suggestion not found.")

    # Authorize access and review permission (e.g., tree owner or admin collaborator)
    family_tree = await get_authorized_family_tree(suggestion.family_tree_id, db, current_user_id)
    if family_tree.owner_id != current_user_id: # Basic check, refine with roles
        # if current_user_id not in admin_collaborators_of_tree...
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to review this suggestion.")

    if suggestion.status not in [MergeSuggestionStatus.PENDING]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Suggestion is already in '{suggestion.status.value}' status and cannot be reviewed again through this endpoint.")

    if review_data.status is None or review_data.status not in [MergeSuggestionStatus.ACCEPTED, MergeSuggestionStatus.REJECTED]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Review status must be 'accepted' or 'rejected'.")

    # If 'accepted', the actual merge logic should happen here or be triggered by a service call.
    # This is a complex operation:
    # 1. Choose which person record to keep (target) and which to archive/delete (source).
    # 2. Migrate data (fields, relationships, media links) from source to target based on 'suggested_changes' or UI input.
    # 3. Update relationships pointing to the source person to now point to the target person.
    # 4. Archive or delete the source person record.
    # 5. Log this merge action.
    # This CRUD should only update the suggestion's status. The merge itself is a service-level task.

    # For now, this endpoint only updates the suggestion's status.
    # A dedicated service function `perform_merge(suggestion, review_data.suggested_changes)` would be called if status is ACCEPTED.

    updated_suggestion = await merge_suggestion_crud.update_merge_suggestion_status(
        db,
        suggestion_id=suggestion_id,
        update_data=review_data,
        reviewer_user_id=current_user_id
    )
    if not updated_suggestion:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to update merge suggestion status.")

    # TODO: Create notifications based on acceptance/rejection for involved parties.
    # if updated_suggestion.status == MergeSuggestionStatus.ACCEPTED:
    #    await notification_service.notify_merge_accepted(...)
    # elif updated_suggestion.status == MergeSuggestionStatus.REJECTED:
    #    await notification_service.notify_merge_rejected(...)

    return updated_suggestion


@router.delete("/{suggestion_id}", status_code=status.HTTP_204_NO_CONTENT)
async def cancel_merge_suggestion( # Or delete, depending on who can do this
    suggestion_id: PyObjectId,
    db: AsyncIOMotorDatabase = Depends(get_db_dependency),
    current_user_id: uuid.UUID = CurrentUserUUID
):
    suggestion = await merge_suggestion_crud.get_merge_suggestion_by_id(db, suggestion_id=suggestion_id)
    if not suggestion:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Merge suggestion not found.")

    # Authorize: Tree owner or the user who suggested it (if suggester_type is 'user')
    family_tree = await get_authorized_family_tree(suggestion.family_tree_id, db, current_user_id)
    can_cancel = False
    if family_tree.owner_id == current_user_id:
        can_cancel = True
    elif suggestion.suggester_type == "user" and suggestion.suggester_user_id == current_user_id:
        can_cancel = True

    if not can_cancel:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to cancel this suggestion.")

    if suggestion.status != MergeSuggestionStatus.PENDING:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only pending suggestions can be cancelled.")

    # Option 1: Soft delete by changing status to CANCELLED
    update_payload = merge_suggestion_schema.MergeSuggestionUpdateSchema(status=MergeSuggestionStatus.CANCELLED, reviewer_notes="Cancelled by user.")
    await merge_suggestion_crud.update_merge_suggestion_status(db, suggestion_id, update_payload, reviewer_user_id=current_user_id)

    # Option 2: Hard delete
    # deleted = await merge_suggestion_crud.delete_merge_suggestion(db, suggestion_id=suggestion_id)
    # if not deleted:
    #     raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to delete/cancel merge suggestion.")

    return Response(status_code=status.HTTP_204_NO_CONTENT)

from fastapi import Response # For 204 status code return type. Already imported.
