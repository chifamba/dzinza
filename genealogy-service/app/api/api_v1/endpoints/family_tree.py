import uuid

from fastapi import APIRouter, Depends, HTTPException, status, Query

from app import schemas # API Schemas
from app.crud import crud_family_tree # CRUD functions
from app.db.base import get_database # DB Dependency
from app.dependencies import AuthenticatedUser, get_current_active_user # Auth Dependency
from motor.motor_asyncio import AsyncIOMotorDatabase # Type hint

router = APIRouter()

@router.post("/", response_model=schemas.FamilyTreeRead, status_code=status.HTTP_201_CREATED)
async def create_family_tree(
    *,
    db: AsyncIOMotorDatabase = Depends(get_database),
    tree_in: schemas.FamilyTreeCreate,
    current_user: AuthenticatedUser = Depends(get_current_active_user)
):
    """
    Create a new family tree for the authenticated user.
    """
    # owner_id will be taken from current_user.id (or however your AuthenticatedUser model stores it)
    created_tree = await crud_family_tree.create_tree(db=db, tree_in=tree_in, owner_id=current_user.id)
    return created_tree

@router.get("", response_model=schemas.FamilyTreeList) # For path without trailing slash
@router.get("/", response_model=schemas.FamilyTreeList) # For path with trailing slash
async def read_family_trees(
    db: AsyncIOMotorDatabase = Depends(get_database),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=0, le=200), # Max 200 trees per request
    current_user: AuthenticatedUser = Depends(get_current_active_user)
):
    """
    Retrieve family trees owned by the authenticated user.
    Supports pagination.
    """
    trees = await crud_family_tree.get_trees_by_owner(db=db, owner_id=current_user.id, skip=skip, limit=limit)
    # total_trees = await crud_family_tree.count_trees_by_owner(db=db, owner_id=current_user.id) # If you need total for pagination
    # For simplicity, if count_trees_by_owner is not yet implemented:
    total_trees = len(trees) # This is only total for current page if limit is less than actual total.
                           # Proper pagination needs a separate count query.
                           # For now, let's assume the FamilyTreeList can just take items and a potentially inaccurate total.
                           # Or, return List[schemas.FamilyTreeRead] directly for now.

    # Let's return List[schemas.FamilyTreeRead] for simplicity if count is not ready.
    # return trees
    # If FamilyTreeList schema is used, and a proper total count is available:
    # return schemas.FamilyTreeList(items=trees, total=total_trees)
    # For now, using a simplified list response:
    return {"items": trees, "total": -1} # Indicate total is not accurately calculated yet


@router.get("/{tree_id}", response_model=schemas.FamilyTreeRead)
async def read_family_tree(
    *,
    db: AsyncIOMotorDatabase = Depends(get_database),
    tree_id: uuid.UUID,
    current_user: AuthenticatedUser = Depends(get_current_active_user)
):
    """
    Get a specific family tree by ID.
    Ensures the authenticated user owns the tree.
    (Public/shared trees would require different logic or a separate endpoint).
    """
    tree = await crud_family_tree.get_tree_by_id(db=db, tree_id=tree_id, owner_id=current_user.id)
    if not tree:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Family tree not found or you do not have permission to access it.",
        )
    # Add privacy check here if trees can be public/shared and user is not owner
    # For now, assumes only owner can access via this endpoint.
    return tree

@router.put("/{tree_id}", response_model=schemas.FamilyTreeRead)
async def update_family_tree(
    *,
    db: AsyncIOMotorDatabase = Depends(get_database),
    tree_id: uuid.UUID,
    tree_in: schemas.FamilyTreeUpdate,
    current_user: AuthenticatedUser = Depends(get_current_active_user)
):
    """
    Update a family tree owned by the authenticated user.
    """
    existing_tree = await crud_family_tree.get_tree_by_id(db=db, tree_id=tree_id, owner_id=current_user.id)
    if not existing_tree:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Family tree not found or you do not have permission to modify it.",
        )

    updated_tree = await crud_family_tree.update_tree(db=db, tree_id=tree_id, tree_in=tree_in, owner_id=current_user.id)
    if not updated_tree: # Should not happen if existing_tree check passed, unless race condition or update_tree logic changes
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, # Or 500 if update failed unexpectedly
            detail="Failed to update family tree.",
        )
    return updated_tree

@router.delete("/{tree_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_family_tree(
    *,
    db: AsyncIOMotorDatabase = Depends(get_database),
    tree_id: uuid.UUID,
    current_user: AuthenticatedUser = Depends(get_current_active_user)
):
    """
    Delete a family tree owned by the authenticated user.
    Note: This is a hard delete of the tree document. Associated persons, etc., are not automatically handled here.
    """
    existing_tree = await crud_family_tree.get_tree_by_id(db=db, tree_id=tree_id, owner_id=current_user.id)
    if not existing_tree:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Family tree not found or you do not have permission to delete it.",
        )

    deleted = await crud_family_tree.delete_tree(db=db, tree_id=tree_id, owner_id=current_user.id)
    if not deleted:
        # This might happen if the tree was deleted between the check and the delete operation (race condition)
        # or if delete_tree itself has further checks that fail.
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, # Or 500 if deletion failed for other reasons
            detail="Failed to delete family tree or tree already deleted.",
        )
    return None # FastAPI will return 204 No Content based on status_code

# TODO: Add an endpoint for public listing/viewing of trees if PrivacySetting.PUBLIC is used.
# TODO: Implement proper pagination for read_family_trees with total count.
# TODO: Add endpoints for managing persons within a tree, relationships, events etc.
# TODO: Consider adding a FamilyTreeMember model/concept for collaborative trees.
