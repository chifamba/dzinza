import uuid
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status, Query
from motor.motor_asyncio import AsyncIOMotorDatabase

from app import schemas
from app.crud import crud_event, crud_person
from app.db.base import get_database
from app.dependencies import AuthenticatedUser, get_current_active_user
from app.models_main import EventType, PersonPrivacyOptions

from .relationship import check_tree_permission # Re-use helper from relationship endpoint or move to shared

router = APIRouter()

@router.post("/trees/{tree_id}/events", response_model=schemas.event.EventRead, status_code=status.HTTP_201_CREATED)
async def create_event_in_tree(
    *,
    db: AsyncIOMotorDatabase = Depends(get_database),
    tree_id: uuid.UUID,
    event_in: schemas.event.EventCreateData,
    current_user: AuthenticatedUser = Depends(get_current_active_user)
):
    """
    Create a new event within a specified family tree.
    User must have edit access to the tree.
    Linked persons/relationships should exist.
    """
    await check_tree_permission(db, tree_id, current_user.id, require_edit=True)

    # Validate linked entities (persons, relationship) if provided
    if event_in.primary_person_id:
        person1 = await crud_person.get_person_by_id(db, person_id=event_in.primary_person_id)
        if not person1 or tree_id not in person1.tree_ids:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Primary person not found or not in the specified tree.")
    if event_in.secondary_person_id:
        person2 = await crud_person.get_person_by_id(db, person_id=event_in.secondary_person_id)
        if not person2 or tree_id not in person2.tree_ids:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Secondary person not found or not in the specified tree.")
    if event_in.relationship_id:
        rel = await crud_relationship.get_relationship_by_id(db, relationship_id=event_in.relationship_id, tree_id=tree_id)
        if not rel:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Relationship not found or not in the specified tree.")

    created_event = await crud_event.create_event(db=db, tree_id=tree_id, event_in=event_in)
    return created_event

@router.get("/events/{event_id}", response_model=schemas.event.EventRead)
async def read_event(
    *,
    db: AsyncIOMotorDatabase = Depends(get_database),
    event_id: uuid.UUID,
    current_user: AuthenticatedUser = Depends(get_current_active_user)
):
    """
    Get a specific event by its ID.
    User must have view access to the tree this event belongs to.
    """
    event = await crud_event.get_event_by_id(db=db, event_id=event_id)
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found.")

    await check_tree_permission(db, event.tree_id, current_user.id, require_edit=False)
    return event

@router.get("/persons/{person_id}/events", response_model=List[schemas.event.EventRead]) # Simpler list response for now
async def list_events_for_person(
    *,
    db: AsyncIOMotorDatabase = Depends(get_database),
    person_id: uuid.UUID,
    tree_id: Optional[uuid.UUID] = Query(None, description="Filter by tree ID if person is in multiple trees and events are tree-specific"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=0, le=200),
    current_user: AuthenticatedUser = Depends(get_current_active_user)
):
    """
    List events associated with a specific person.
    User must have view access to the person (and tree, if specified).
    """
    person = await crud_person.get_person_by_id(db, person_id=person_id)
    if not person:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Person not found.")

    if tree_id:
        await check_tree_permission(db, tree_id, current_user.id, require_edit=False)
        if tree_id not in person.tree_ids:
             raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Person not associated with the specified tree.")
    else:
        # If no tree_id, ensure user can view the person via at least one common tree.
        can_view_person = False
        for p_tree_id in person.tree_ids:
            try:
                await check_tree_permission(db, p_tree_id, current_user.id, require_edit=False)
                can_view_person = True
                break # Found a tree user has access to
            except HTTPException:
                continue
        if not can_view_person and person.privacy_settings.show_profile != PersonPrivacyOptions.PUBLIC:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot access events for this person.")

    events = await crud_event.get_events_for_person(db=db, person_id=person_id, tree_id=tree_id, skip=skip, limit=limit)
    # TODO: Add total count for pagination if using schemas.event.EventList
    return events


@router.get("/relationships/{relationship_id}/events", response_model=List[schemas.event.EventRead])
async def list_events_for_relationship(
    *,
    db: AsyncIOMotorDatabase = Depends(get_database),
    relationship_id: uuid.UUID,
    tree_id: Optional[uuid.UUID] = Query(None, description="Specify tree ID for context, if relationship could exist in multiple (though unlikely)"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=0, le=200),
    current_user: AuthenticatedUser = Depends(get_current_active_user)
):
    """List events for a specific relationship."""
    relationship = await crud_relationship.get_relationship_by_id(db, relationship_id=relationship_id)
    if not relationship:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Relationship not found.")

    # Use the relationship's tree_id for permission check, or the provided tree_id if it matches.
    context_tree_id = tree_id or relationship.tree_id
    if tree_id and tree_id != relationship.tree_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Provided tree_id does not match relationship's tree_id.")

    await check_tree_permission(db, context_tree_id, current_user.id, require_edit=False)

    events = await crud_event.get_events_for_relationship(db=db, relationship_id=relationship_id, tree_id=context_tree_id, skip=skip, limit=limit)
    return events


@router.get("/trees/{tree_id}/events", response_model=schemas.event.EventList)
async def list_events_in_tree(
    *,
    db: AsyncIOMotorDatabase = Depends(get_database),
    tree_id: uuid.UUID,
    event_type: Optional[EventType] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=0, le=500),
    current_user: AuthenticatedUser = Depends(get_current_active_user)
):
    """List all events for a specific tree, optionally filtered by event_type."""
    await check_tree_permission(db, tree_id, current_user.id, require_edit=False)

    events = await crud_event.get_events_for_tree(db=db, tree_id=tree_id, event_type=event_type, skip=skip, limit=limit)
    total_events = await crud_event.count_events_for_tree(db=db, tree_id=tree_id, event_type=event_type)
    return schemas.event.EventList(items=events, total=total_events)


@router.put("/events/{event_id}", response_model=schemas.event.EventRead)
async def update_event_details(
    *,
    db: AsyncIOMotorDatabase = Depends(get_database),
    event_id: uuid.UUID,
    event_in: schemas.event.EventUpdateData,
    current_user: AuthenticatedUser = Depends(get_current_active_user)
):
    """Update an event's details. User must have edit access to the tree."""
    existing_event = await crud_event.get_event_by_id(db=db, event_id=event_id)
    if not existing_event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found.")

    await check_tree_permission(db, existing_event.tree_id, current_user.id, require_edit=True)

    # Prevent changing tree_id via this update.
    updated_event = await crud_event.update_event(
        db=db, event_id=event_id, event_in=event_in, tree_id=existing_event.tree_id
    )
    if not updated_event:
         raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to update event.")
    return updated_event

@router.delete("/events/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_event_from_tree(
    *,
    db: AsyncIOMotorDatabase = Depends(get_database),
    event_id: uuid.UUID,
    current_user: AuthenticatedUser = Depends(get_current_active_user)
):
    """Delete an event. User must have edit access to the tree."""
    event_to_delete = await crud_event.get_event_by_id(db=db, event_id=event_id)
    if not event_to_delete:
        return None # Idempotent

    await check_tree_permission(db, event_to_delete.tree_id, current_user.id, require_edit=True)

    deleted = await crud_event.delete_event(db=db, event_id=event_id, tree_id=event_to_delete.tree_id)
    # No specific error if not deleted, as it might have been deleted between check and operation.
    return None
