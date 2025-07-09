import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status, Query
from motor.motor_asyncio import AsyncIOMotorDatabase

from app import schemas # API Schemas (specifically schemas.relationship)
from app.crud import crud_relationship, crud_family_tree, crud_person # CRUD functions
from app.db.base import get_database # DB Dependency
from app.dependencies import AuthenticatedUser, get_current_active_user # Auth Dependency
from app.models_main import RelationshipType, PersonPrivacyOptions

router = APIRouter()

# Helper function for permission check (can be moved to a shared dependency/util)
async def check_tree_permission(db: AsyncIOMotorDatabase, tree_id: uuid.UUID, user_id: str, require_edit: bool = False):
    tree = await crud_family_tree.get_tree_by_id(db=db, tree_id=tree_id, owner_id=user_id) # Basic owner check
    # TODO: Implement more granular permission check (e.g., collaborators)
    # if require_edit and not tree.can_user_edit(user_id): ...
    # if not require_edit and not tree.can_user_view(user_id): ...
    if not tree:
        action = "modify" if require_edit else "access"
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Family tree not found or you do not have permission to {action} it.",
        )
    return tree


@router.post("/trees/{tree_id}/relationships", response_model=schemas.relationship.RelationshipRead, status_code=status.HTTP_201_CREATED)
async def create_relationship_in_tree(
    *,
    db: AsyncIOMotorDatabase = Depends(get_database),
    tree_id: uuid.UUID,
    relationship_in: schemas.relationship.RelationshipCreateData,
    current_user: AuthenticatedUser = Depends(get_current_active_user)
):
    """
    Create a new relationship between two persons within a specified family tree.
    User must have edit access to the tree.
    Persons involved must exist and preferably be part of the tree.
    """
    await check_tree_permission(db, tree_id, current_user.id, require_edit=True)

    # Validate persons exist
    person1 = await crud_person.get_person_by_id(db, person_id=relationship_in.person1_id)
    person2 = await crud_person.get_person_by_id(db, person_id=relationship_in.person2_id)
    if not person1 or not person2:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="One or both persons in the relationship not found.")

    # Optional: Check if persons are part of the tree_id (or add them)
    # For now, assume they are or that linking is handled separately/implicitly by being in a relationship in that tree.

    created_relationship = await crud_relationship.create_relationship(db=db, tree_id=tree_id, relationship_in=relationship_in)
    return created_relationship

@router.get("/persons/{person_id}/relationships", response_model=schemas.relationship.RelationshipList)
async def list_relationships_for_person(
    *,
    db: AsyncIOMotorDatabase = Depends(get_database),
    person_id: uuid.UUID,
    tree_id: Optional[uuid.UUID] = Query(None, description="Filter by tree ID if person is in multiple trees"),
    relationship_type: Optional[RelationshipType] = Query(None, description="Filter by relationship type"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=0, le=200),
    current_user: AuthenticatedUser = Depends(get_current_active_user)
):
    """
    List all relationships for a specific person.
    User must have view access to the person (implicitly via tree access).
    If tree_id is provided, user must have access to that specific tree.
    """
    person = await crud_person.get_person_by_id(db, person_id=person_id)
    if not person:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Person not found.")

    # Permission check: User must be able to view the person.
    # This usually means having access to at least one tree the person is in.
    # If tree_id is specified in query, check that tree specifically.
    if tree_id:
        await check_tree_permission(db, tree_id, current_user.id, require_edit=False)
    else:
        # If no tree_id, check if user can view the person through any of their associated trees.
        # (Simplified: assumes if user can fetch the person, they can view relationships. More complex logic needed for real privacy)
        can_view_person = False
        for p_tree_id in person.tree_ids:
            try:
                await check_tree_permission(db, p_tree_id, current_user.id, require_edit=False)
                can_view_person = True
                break
            except HTTPException:
                continue # User doesn't have access to this particular tree
        if not can_view_person and person.privacy_settings.show_profile != PersonPrivacyOptions.PUBLIC:
             raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot access relationships for this person.")


    relationships = await crud_relationship.get_relationships_for_person(
        db=db, person_id=person_id, tree_id=tree_id, relationship_type=relationship_type, skip=skip, limit=limit
    )
    total_relationships = await crud_relationship.count_relationships_for_person(
        db=db, person_id=person_id, tree_id=tree_id, relationship_type=relationship_type
    )
    return schemas.relationship.RelationshipList(items=relationships, total=total_relationships)


@router.get("/relationships/{relationship_id}", response_model=schemas.relationship.RelationshipRead)
async def read_relationship(
    *,
    db: AsyncIOMotorDatabase = Depends(get_database),
    relationship_id: uuid.UUID,
    current_user: AuthenticatedUser = Depends(get_current_active_user)
):
    """
    Get a specific relationship by its ID.
    User must have view access to the tree this relationship belongs to.
    """
    relationship = await crud_relationship.get_relationship_by_id(db=db, relationship_id=relationship_id)
    if not relationship:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Relationship not found.")

    await check_tree_permission(db, relationship.tree_id, current_user.id, require_edit=False)
    return relationship

@router.put("/relationships/{relationship_id}", response_model=schemas.relationship.RelationshipRead)
async def update_relationship_details(
    *,
    db: AsyncIOMotorDatabase = Depends(get_database),
    relationship_id: uuid.UUID,
    relationship_in: schemas.relationship.RelationshipUpdateData,
    current_user: AuthenticatedUser = Depends(get_current_active_user)
):
    """
    Update a relationship's details.
    User must have edit access to the tree this relationship belongs to.
    """
    existing_relationship = await crud_relationship.get_relationship_by_id(db=db, relationship_id=relationship_id)
    if not existing_relationship:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Relationship not found.")

    await check_tree_permission(db, existing_relationship.tree_id, current_user.id, require_edit=True)

    # Prevent changing person1_id, person2_id, or tree_id via this update method.
    # RelationshipUpdateData schema should not include these.

    updated_relationship = await crud_relationship.update_relationship(
        db=db, relationship_id=relationship_id, relationship_in=relationship_in, tree_id=existing_relationship.tree_id
    )
    if not updated_relationship:
         raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to update relationship.")
    return updated_relationship

@router.delete("/relationships/{relationship_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_relationship_from_tree(
    *,
    db: AsyncIOMotorDatabase = Depends(get_database),
    relationship_id: uuid.UUID,
    current_user: AuthenticatedUser = Depends(get_current_active_user)
):
    """
    Delete a relationship.
    User must have edit access to the tree this relationship belongs to.
    """
    relationship_to_delete = await crud_relationship.get_relationship_by_id(db=db, relationship_id=relationship_id)
    if not relationship_to_delete:
        # Idempotency: if already deleted, return 204
        return None
        # raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Relationship not found.")

    await check_tree_permission(db, relationship_to_delete.tree_id, current_user.id, require_edit=True)

    deleted = await crud_relationship.delete_relationship(db=db, relationship_id=relationship_id, tree_id=relationship_to_delete.tree_id)
    if not deleted:
        # This might happen if deleted between check and operation, or if delete_relationship has further checks.
        # For consistency with "not found" being a 204, we could argue this path should also be 204.
        # However, if it existed and failed to delete, a 500 might be more appropriate.
        # Let's assume if it existed, delete should work unless server error.
        # If crud.delete_relationship returns False because it didn't find it (e.g. after tree_id check),
        # then the initial get would have failed.
        pass # Already covered by returning None for 204. If it was a real error, it'd be an exception.

    return None # FastAPI will return 204 No Content
