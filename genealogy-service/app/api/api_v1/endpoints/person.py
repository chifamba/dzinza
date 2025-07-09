import uuid
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status, Query
from motor.motor_asyncio import AsyncIOMotorDatabase

from app import schemas # API Schemas (ensure person schemas are imported, e.g. from app.schemas.person)
from app.crud import crud_person, crud_family_tree # CRUD functions
from app.db.base import get_database # DB Dependency
from app.dependencies import AuthenticatedUser, get_current_active_user # Auth Dependency
from app.models_main import PersonPrivacyOptions

router = APIRouter()

@router.post("/trees/{tree_id}/persons", response_model=schemas.person.PersonRead, status_code=status.HTTP_201_CREATED)
async def create_person_in_tree(
    *,
    db: AsyncIOMotorDatabase = Depends(get_database),
    tree_id: uuid.UUID,
    person_in: schemas.person.PersonCreate, # Use the specific schema
    current_user: AuthenticatedUser = Depends(get_current_active_user)
):
    """
    Create a new person and associate them with the given family tree.
    The user must have edit access to the tree.
    """
    # 1. Check if tree exists and user has permission (e.g., owner or collaborator with edit rights)
    tree = await crud_family_tree.get_tree_by_id(db=db, tree_id=tree_id, owner_id=current_user.id) # Basic owner check
    # TODO: Expand permission check for collaborators if that logic is added to FamilyTree CRUD/model
    if not tree:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Family tree not found or you do not have permission to add persons to it.",
        )

    # 2. Ensure the input schema for person_in explicitly includes the tree_id or that create_person handles it.
    # The PersonCreate schema has tree_ids: List[uuid.UUID]. We should ensure this tree_id is part of it.
    if tree_id not in person_in.tree_ids:
        person_in.tree_ids.append(tree_id) # Or ensure it's the primary one if logic dictates

    created_person = await crud_person.create_person(db=db, person_in=person_in, creator_user_id=current_user.id)
    return created_person


@router.get("/trees/{tree_id}/persons", response_model=schemas.person.PersonList) # Using PersonList
async def list_persons_in_tree(
    *,
    db: AsyncIOMotorDatabase = Depends(get_database),
    tree_id: uuid.UUID,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=0, le=200),
    current_user: AuthenticatedUser = Depends(get_current_active_user)
):
    """
    List all persons associated with a specific family tree.
    User must have view access to the tree.
    """
    tree = await crud_family_tree.get_tree_by_id(db=db, tree_id=tree_id, owner_id=current_user.id) # Basic owner check
    # TODO: Expand permission check for collaborators / public trees
    if not tree:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Family tree not found or you do not have permission to view it.",
        )

    persons = await crud_person.get_persons_by_tree_id(db=db, tree_id=tree_id, skip=skip, limit=limit)
    total_persons_in_tree = await crud_person.count_persons_by_tree_id(db=db, tree_id=tree_id)

    return schemas.person.PersonList(items=persons, total=total_persons_in_tree)


@router.get("/persons/{person_id}", response_model=schemas.person.PersonRead)
async def read_person(
    *,
    db: AsyncIOMotorDatabase = Depends(get_database),
    person_id: uuid.UUID,
    current_user: AuthenticatedUser = Depends(get_current_active_user)
):
    """
    Get a specific person by their ID.
    User must have view access to at least one tree the person belongs to.
    (This implies checking person.tree_ids against user's accessible trees).
    """
    person = await crud_person.get_person_by_id(db=db, person_id=person_id)
    if not person:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Person not found.")

    # Permission check: Does the current user have access to any of the person's trees?
    can_view = False
    if person.tree_ids:
        for tree_id in person.tree_ids:
            tree = await crud_family_tree.get_tree_by_id(db=db, tree_id=tree_id, owner_id=current_user.id) # Basic owner check
            # TODO: Add logic for public trees or collaborator access if tree.canUserView(current_user.id)
            if tree: # If user owns any of the trees the person is in
                can_view = True
                break

    if not can_view:
        # Check person's own privacy settings if they allow public view irrespective of tree
        if person.privacy_settings.show_profile != PersonPrivacyOptions.PUBLIC:
             raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to view this person."
            )
        # If profile is public, allow view even if not associated with user's trees (e.g. famous person)
        # This logic needs careful design based on product requirements for public data.

    return person


@router.put("/persons/{person_id}", response_model=schemas.person.PersonRead)
async def update_person_details(
    *,
    db: AsyncIOMotorDatabase = Depends(get_database),
    person_id: uuid.UUID,
    person_in: schemas.person.PersonUpdate,
    current_user: AuthenticatedUser = Depends(get_current_active_user)
):
    """
    Update a person's details.
    User must have edit access to at least one tree the person belongs to.
    """
    existing_person = await crud_person.get_person_by_id(db=db, person_id=person_id)
    if not existing_person:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Person not found.")

    # Permission check (simplified: user must own one of the trees)
    can_edit = False
    if existing_person.tree_ids:
        for tree_id in existing_person.tree_ids:
            tree = await crud_family_tree.get_tree_by_id(db=db, tree_id=tree_id, owner_id=current_user.id)
            # TODO: Add logic for collaborator edit rights: if tree.canUserEdit(current_user.id)
            if tree:
                can_edit = True
                break
    if not can_edit:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to edit this person."
        )

    updated_person = await crud_person.update_person(db=db, person_id=person_id, person_in=person_in, changed_by_user_id=current_user.id)
    if not updated_person: # Should ideally not happen if existing_person was found
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to update person.")
    return updated_person


@router.delete("/persons/{person_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_person_from_system( # Renamed to distinguish from unlinking
    *,
    db: AsyncIOMotorDatabase = Depends(get_database),
    person_id: uuid.UUID,
    current_user: AuthenticatedUser = Depends(get_current_active_user)
):
    """
    Delete a person from the system (hard delete).
    User must have administrative rights over this person (e.g., owner of ALL trees they are in).
    This is a destructive operation and should also handle cleanup of related entities (relationships, events).
    """
    person_to_delete = await crud_person.get_person_by_id(db=db, person_id=person_id)
    if not person_to_delete:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Person not found.")

    # Strict permission: user must own ALL trees this person is part of, or be a system admin.
    is_sole_controller = True # Assume true, prove false
    if not person_to_delete.tree_ids: # Orphaned person? Or person not yet in any tree.
        # Logic for deleting persons not in any tree could be different
        # For now, assume if not in any trees, only creator or admin can delete.
        # This needs more thought: who is creator if not in tree?
        # Let's assume for now, must be in at least one tree owned by user.
        is_sole_controller = False
    else:
        for tree_id in person_to_delete.tree_ids:
            tree = await crud_family_tree.get_tree_by_id(db=db, tree_id=tree_id, owner_id=current_user.id)
            if not tree: # User does not own this tree
                is_sole_controller = False
                break

    if not is_sole_controller: # And not a system admin (admin check not implemented here)
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to delete this person from all trees or the system.",
        )

    # TODO: Implement cascading deletion logic here or in a service layer:
    # 1. Delete all relationships involving this person.
    # 2. Delete all events primarily linked to this person.
    # 3. Delete PersonHistory for this person.
    # 4. Consider impact on MergeSuggestions.
    # For now, just deleting the person document:

    deleted = await crud_person.delete_person(db=db, person_id=person_id, changed_by_user_id=current_user.id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to delete person.")

    return None


@router.post("/persons/{person_id}/trees/{tree_id}", response_model=schemas.person.PersonRead)
async def link_person_to_tree(
    *,
    db: AsyncIOMotorDatabase = Depends(get_database),
    person_id: uuid.UUID,
    tree_id: uuid.UUID,
    current_user: AuthenticatedUser = Depends(get_current_active_user)
):
    """Associate an existing person with an additional family tree. User must own the tree."""
    tree = await crud_family_tree.get_tree_by_id(db=db, tree_id=tree_id, owner_id=current_user.id)
    if not tree:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Target family tree not found or not owned by user.")

    person = await crud_person.get_person_by_id(db=db, person_id=person_id)
    if not person:
         raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Person not found.")
    # Additional check: can user view/edit this person to link them? (Simplified for now)

    updated_person = await crud_person.add_person_to_tree(db=db, person_id=person_id, tree_id=tree_id, changed_by_user_id=current_user.id)
    if not updated_person:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to link person to tree.")
    return updated_person


@router.delete("/persons/{person_id}/trees/{tree_id}", response_model=schemas.person.PersonRead)
async def unlink_person_from_tree(
    *,
    db: AsyncIOMotorDatabase = Depends(get_database),
    person_id: uuid.UUID,
    tree_id: uuid.UUID,
    current_user: AuthenticatedUser = Depends(get_current_active_user)
):
    """Disassociate a person from a specific family tree. User must own the tree."""
    tree = await crud_family_tree.get_tree_by_id(db=db, tree_id=tree_id, owner_id=current_user.id)
    if not tree:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Target family tree not found or not owned by user.")

    person = await crud_person.get_person_by_id(db=db, person_id=person_id)
    if not person:
         raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Person not found.")

    if tree_id not in person.tree_ids:
        return person # Idempotent: already not in this tree

    updated_person = await crud_person.remove_person_from_tree(db=db, person_id=person_id, tree_id=tree_id, changed_by_user_id=current_user.id)
    if not updated_person:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to unlink person from tree.")

    # Business logic: if updated_person.tree_ids is now empty, should the person be deleted?
    # This is complex. For now, unlinking is separate from deletion.
    return updated_person


@router.get("/persons/search/", response_model=List[schemas.person.PersonSummary]) # Using summary for search results
async def search_persons(
    *,
    db: AsyncIOMotorDatabase = Depends(get_database),
    name: str = Query(..., min_length=2, description="Name query to search for."),
    tree_id: Optional[uuid.UUID] = Query(None, description="Optional: scope search to a specific tree ID."),
    limit: int = Query(20, ge=1, le=100),
    current_user: AuthenticatedUser = Depends(get_current_active_user)
):
    """
    Search for persons by name.
    If tree_id is provided, search is scoped to that tree (user must have view access).
    If no tree_id, searches across all persons the user might have access to (complex permission logic).
    For now, if tree_id is provided, we check ownership. If not, this endpoint might be restricted or require admin.
    """
    if tree_id:
        tree = await crud_family_tree.get_tree_by_id(db=db, tree_id=tree_id, owner_id=current_user.id)
        if not tree:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot search in specified tree.")
    else:
        # Global search without tree_id is complex due to permissions.
        # For now, let's disallow it or make it admin-only.
        # This example will proceed but in a real app this needs careful thought.
        # Consider what "global search" means for a non-admin user.
        pass # Allow global search for now for demo.

    persons = await crud_person.search_persons_by_name(db=db, name_query=name, tree_id=tree_id, limit=limit)

    # Further filter results based on user's access to each person's trees/privacy if search was global
    # This is simplified here.

    # Convert Person objects to PersonSummary format
    result = []
    for person in persons:
        summary = schemas.person.PersonSummary(
            id=person.id,
            primary_name=person.primary_name,
            gender=person.gender,
            is_living=person.is_living,
            birth_date_string=person.birth_date_string,
            death_date_string=person.death_date_string
        )
        result.append(summary)
    
    return result
