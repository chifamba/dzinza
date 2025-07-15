import uuid
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status, Query
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.models_main import MergeSuggestionStatus
from app import schemas # API Schemas (specifically schemas.merge_suggestion)
from app.crud import crud_merge_suggestion, crud_person # CRUD functions
from app.db.base import get_database # DB Dependency
from app.dependencies import AuthenticatedUser, get_current_active_user # Auth Dependency

router = APIRouter()

# Note: Creating merge suggestions might be a system-internal process (e.g., by Celery task)
# or by admins. If users can manually suggest merges, this endpoint would be used.
@router.post("/", response_model=schemas.merge_suggestion.MergeSuggestionRead, status_code=status.HTTP_201_CREATED)
async def create_manual_merge_suggestion(
    *,
    db: AsyncIOMotorDatabase = Depends(get_database),
    suggestion_in: schemas.merge_suggestion.MergeSuggestionCreate,
    current_user: AuthenticatedUser = Depends(get_current_active_user)
    # tree_id: Optional[uuid.UUID] = Query(None, description="Contextual tree_id if suggestion is made within a tree view")
):
    """
    Manually create a merge suggestion between two persons.
    Requires appropriate permissions (e.g., admin, or edit rights to involved persons/trees).
    """
    # Validate persons exist
    person1 = await crud_person.get_person_by_id(db, person_id=suggestion_in.new_person_id)
    person2 = await crud_person.get_person_by_id(db, person_id=suggestion_in.existing_person_id)
    if not person1 or not person2:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="One or both persons for merge suggestion not found.")

    # TODO: Permission check: Does user have rights to suggest merges for these persons?
    # This might involve checking if user owns/can_edit trees associated with person1 and person2.
    # For now, allowing any authenticated user to create, assuming system or admin reviews.

    suggestion = await crud_merge_suggestion.create_merge_suggestion(
        db=db, suggestion_in=suggestion_in, created_by_user_id=current_user.id
    )
    return suggestion

@router.get("/persons/{person_id}", response_model=List[schemas.merge_suggestion.MergeSuggestionRead])
async def list_suggestions_for_person(
    *,
    db: AsyncIOMotorDatabase = Depends(get_database),
    person_id: uuid.UUID,
    status_filter: Optional[MergeSuggestionStatus] = Query(None, alias="status"), # Use alias for query param
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    current_user: AuthenticatedUser = Depends(get_current_active_user)
):
    """
    List merge suggestions involving a specific person.
    User must have view access to the person.
    """
    person = await crud_person.get_person_by_id(db, person_id=person_id)
    if not person:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Person not found.")

    # TODO: Permission check: can user view this person and their suggestions?
    # Simplified: assume if user can fetch person, they can see suggestions.
    # A more granular check would involve tree ownership/collaboration for the person's trees.

    suggestions = await crud_merge_suggestion.get_suggestions_for_person(
        db=db, person_id=person_id, status=status_filter, skip=skip, limit=limit
    )
    # total_suggestions = await crud_merge_suggestion.count_suggestions_for_person(
    #     db=db, person_id=person_id, status=status_filter
    # )
    # For a list response, typically just return the items if total is not part of a specific list schema.
    return suggestions


@router.get("/pending", response_model=List[schemas.merge_suggestion.MergeSuggestionRead])
# @router.get("/pending", response_model=schemas.merge_suggestion.MergeSuggestionList) # If using a list schema with total
async def list_pending_merge_suggestions(
    *,
    db: AsyncIOMotorDatabase = Depends(get_database),
    # tree_id: Optional[uuid.UUID] = Query(None, description="Filter by tree ID - requires complex query logic"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    # current_user: AuthenticatedUser = Depends(require_role(["admin", "curator"])) # Example admin/curator role check
    current_user: AuthenticatedUser = Depends(get_current_active_user) # For now, any user can see pending for demo
):
    """
    List all pending merge suggestions.
    Typically for admin or curator review.
    (Tree-specific filtering for pending suggestions is complex and not implemented here).
    """
    # TODO: Implement proper admin/curator role check for this endpoint.

    suggestions = await crud_merge_suggestion.get_pending_suggestions(db=db, skip=skip, limit=limit)
    # total_pending = await crud_merge_suggestion.count_pending_suggestions(db=db) # if count method exists
    # return schemas.merge_suggestion.MergeSuggestionList(items=suggestions, total=total_pending, pending_count=total_pending)
    return suggestions


@router.get("/{suggestion_id}", response_model=schemas.merge_suggestion.MergeSuggestionRead)
async def read_merge_suggestion(
    *,
    db: AsyncIOMotorDatabase = Depends(get_database),
    suggestion_id: uuid.UUID,
    current_user: AuthenticatedUser = Depends(get_current_active_user)
):
    """
    Get a specific merge suggestion by its ID.
    User needs permission to view the involved persons/trees.
    """
    suggestion = await crud_merge_suggestion.get_suggestion_by_id(db=db, suggestion_id=suggestion_id)
    if not suggestion:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Merge suggestion not found.")

    # TODO: Permission check: Can user view this specific suggestion?
    # (e.g., based on access to persons involved or being an admin)
    # For now, allow if suggestion exists.
    return suggestion

@router.patch("/{suggestion_id}/status", response_model=schemas.merge_suggestion.MergeSuggestionRead)
async def update_merge_suggestion_status(
    *,
    db: AsyncIOMotorDatabase = Depends(get_database),
    suggestion_id: uuid.UUID,
    status_update: schemas.merge_suggestion.MergeSuggestionUpdate, # Contains the new status
    current_user: AuthenticatedUser = Depends(get_current_active_user)
):
    """
    Update the status of a merge suggestion (accept or decline).
    Requires appropriate permissions (e.g., admin, or edit rights to involved persons/trees).
    """
    # TODO: Permission check. User needs rights to accept/decline for the involved persons.
    # This might involve checking tree ownership/collaboration for trees of person1 and person2.

    updated_suggestion = await crud_merge_suggestion.update_suggestion_status(
        db=db, suggestion_id=suggestion_id, status=status_update.status, updated_by_user_id=current_user.id
    )
    if not updated_suggestion:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, # Or 400 if status was invalid for update
            detail="Merge suggestion not found, already processed, or update failed."
        )

    # If status is 'accepted', the actual merge logic is complex and typically handled by a service method
    # or a background task, which might be triggered here.
    # For now, this endpoint only updates the suggestion's status.
    if updated_suggestion.status == MergeSuggestionStatus.ACCEPTED:
        # Placeholder: Trigger merge process
        # await service_layer.process_person_merge(db, suggestion=updated_suggestion)
        pass

    return updated_suggestion


@router.delete("/{suggestion_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_merge_suggestion(
    *,
    db: AsyncIOMotorDatabase = Depends(get_database),
    suggestion_id: uuid.UUID,
    # current_user: AuthenticatedUser = Depends(require_role(["admin"])) # Example admin role
    current_user: AuthenticatedUser = Depends(get_current_active_user) # For now, any user for demo
):
    """
    Delete a merge suggestion. (Typically an admin action if suggestion is invalid).
    """
    # TODO: Proper admin role check.
    suggestion = await crud_merge_suggestion.get_suggestion_by_id(db=db, suggestion_id=suggestion_id)
    if not suggestion:
        # Idempotent: if already deleted, return 204
        return None

    deleted = await crud_merge_suggestion.delete_suggestion(db=db, suggestion_id=suggestion_id)
    if not deleted:
        # Should not happen if get_suggestion_by_id found it, unless race condition.
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to delete merge suggestion.")
    return None
