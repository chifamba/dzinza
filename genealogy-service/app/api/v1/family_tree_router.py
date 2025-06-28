from fastapi import APIRouter, Depends, HTTPException, status, Query
from motor.motor_asyncio import AsyncIOMotorDatabase
import uuid # For user_id
from typing import List, Optional

from app.db.database import get_db_dependency
from app.crud import family_tree_crud, person_crud, relationship_crud, person_history_crud
from app.schemas import family_tree_schema, PaginatedResponse
from app.models.base_model import PyObjectId # For ID validation/conversion
from app.middleware.auth_middleware import get_current_active_user_id_dependency
from app.utils.logger import logger # Import logger


CurrentUserUUID = Depends(get_current_active_user_id_dependency)

router = APIRouter()

@router.post("/", response_model=family_tree_schema.FamilyTreeResponseSchema, status_code=status.HTTP_201_CREATED)
async def create_family_tree(
    tree_in: family_tree_schema.FamilyTreeCreateSchema,
    db: AsyncIOMotorDatabase = Depends(get_db_dependency),
    current_user_id: uuid.UUID = CurrentUserUUID
):
    created_tree = await family_tree_crud.create_family_tree(db, tree_data=tree_in, owner_id=current_user_id)
    if not created_tree:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to create family tree.")
    return created_tree

@router.get("/", response_model=PaginatedResponse[family_tree_schema.FamilyTreeResponseSchema])
async def get_my_family_trees(
    db: AsyncIOMotorDatabase = Depends(get_db_dependency),
    current_user_id: uuid.UUID = CurrentUserUUID,
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=100),
    include_collaborations: bool = Query(True, description="Include trees where user is a collaborator")
):
    skip = (page - 1) * size

    owner_trees = await family_tree_crud.get_family_trees_by_owner_id(db, owner_id=current_user_id, skip=skip, limit=size)
    total_owner_trees = await family_tree_crud.count_family_trees_by_owner(db, owner_id=current_user_id)

    items = owner_trees
    total = total_owner_trees

    if include_collaborations:
        # This pagination logic needs refinement if mixing owned and collaborated trees.
        # For simplicity, let's assume for now pagination applies primarily to owned trees,
        # and collaborated trees are listed additionally or need separate pagination.
        # A more robust way: fetch all IDs, then fetch unique trees with combined pagination.
        collaborator_trees = await family_tree_crud.get_family_trees_by_collaborator_id(db, user_id=current_user_id) # No pagination for now

        # Merge and de-duplicate if a user is both owner and collaborator (though unlikely for different trees)
        tree_ids_seen = {str(tree.id) for tree in items}
        for collab_tree in collaborator_trees:
            if str(collab_tree.id) not in tree_ids_seen:
                items.append(collab_tree)
                tree_ids_seen.add(str(collab_tree.id))
        # Total count would also need adjustment if merging this way.
        # For a simple combined list without complex pagination on merged results:
        total = len(items) # This is not true pagination total for the merged set.

    return PaginatedResponse(items=items, total=total, page=page, size=size)


@router.get("/{tree_id}", response_model=family_tree_schema.FamilyTreeResponseSchema)
async def get_family_tree(
    tree_id: PyObjectId,
    db: AsyncIOMotorDatabase = Depends(get_db_dependency),
    current_user_id: uuid.UUID = CurrentUserUUID # To verify access
):
    tree = await family_tree_crud.get_family_tree_by_id(db, tree_id=tree_id)
    if not tree:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Family tree not found.")

    # Authorization check: user must be owner or collaborator
    if tree.owner_id != current_user_id and current_user_id not in tree.collaborator_ids:
        # TODO: Consider privacy settings (e.g., public trees might be viewable)
        # if tree.privacy_settings.visibility == "public": return tree
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to access this family tree.")
    return tree

@router.put("/{tree_id}", response_model=family_tree_schema.FamilyTreeResponseSchema)
async def update_family_tree(
    tree_id: PyObjectId,
    tree_update: family_tree_schema.FamilyTreeUpdateSchema,
    db: AsyncIOMotorDatabase = Depends(get_db_dependency),
    current_user_id: uuid.UUID = CurrentUserUUID
):
    tree = await family_tree_crud.get_family_tree_by_id(db, tree_id=tree_id)
    if not tree:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Family tree not found.")
    if tree.owner_id != current_user_id: # Only owner can update main tree details
        # Collaborators with 'editor' role might be allowed certain updates in a more granular system.
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the owner can update this family tree.")

    updated_tree = await family_tree_crud.update_family_tree(db, tree_id=tree_id, update_data=tree_update)
    if not updated_tree:
        # This might happen if update_one reported no modification but tree still exists (e.g. same data)
        # or if tree was deleted between get and update.
        check_tree = await family_tree_crud.get_family_tree_by_id(db, tree_id=tree_id)
        if check_tree: return check_tree # No actual change, return current
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Family tree not found or update failed.")
    return updated_tree

@router.delete("/{tree_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_family_tree(
    tree_id: PyObjectId,
    db: AsyncIOMotorDatabase = Depends(get_db_dependency),
    current_user_id: uuid.UUID = CurrentUserUUID
):
    tree = await family_tree_crud.get_family_tree_by_id(db, tree_id=tree_id)
    if not tree:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Family tree not found.")
    if tree.owner_id != current_user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the owner can delete this family tree.")

    # Complex delete: remove associated persons, relationships, history, etc.
    # This should be a background task or a carefully managed transaction-like process.
    # For now, simplified:

    # 1. Delete relationships in the tree
    await relationship_crud.delete_relationships_in_family_tree(db, family_tree_id=tree_id)
    # 2. Delete person history in the tree
    await person_history_crud.delete_history_for_family_tree(db, family_tree_id=tree_id)
    # 3. Delete persons in the tree
    # Need a person_crud.delete_persons_in_family_tree - for now, assume it's handled or do it manually
    persons_in_tree = await person_crud.get_persons_by_family_tree_id(db, family_tree_id=tree_id, limit=0) # Get all
    for person_doc in persons_in_tree: # person_doc needs to be PersonModel
         await person_crud.delete_person(db, person_id=person_doc.id, changed_by_user_id=current_user_id) # changed_by_user_id might not be right here if system delete

    # 4. Delete the tree itself
    deleted = await family_tree_crud.delete_family_tree(db, tree_id=tree_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to delete family tree.")
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# --- Collaborators ---
@router.post("/{tree_id}/collaborators", status_code=status.HTTP_200_OK) # Should be 201 if new, 200 if updated
async def add_collaborator(
    tree_id: PyObjectId,
    collaborator_in: family_tree_schema.FamilyTreeAddCollaboratorSchema,
    db: AsyncIOMotorDatabase = Depends(get_db_dependency),
    current_user_id: uuid.UUID = CurrentUserUUID
):
    tree = await family_tree_crud.get_family_tree_by_id(db, tree_id=tree_id)
    if not tree:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Family tree not found.")
    if tree.owner_id != current_user_id: # Only owner can add collaborators directly
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the owner can add collaborators.")

    # Resolve collaborator_in.user_email to a user_id (requires call to auth-service or shared user table)
    # This is a simplification. In a real system, you'd look up the user by email.
    collaborator_user_id_to_add: Optional[uuid.UUID] = collaborator_in.user_id
    if collaborator_in.user_email and not collaborator_user_id_to_add:
        # Placeholder: Assume a function exists to get user ID by email (e.g., from auth service)
        # collaborator_user_id_to_add = await get_user_id_by_email_from_auth_service(collaborator_in.user_email)
        # if not collaborator_user_id_to_add:
        #     raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User with specified email not found.")
        raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail="Adding collaborator by email needs user directory lookup.")

    if not collaborator_user_id_to_add:
         raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Collaborator user ID not provided.")

    if collaborator_user_id_to_add == tree.owner_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Owner cannot be added as a collaborator.")

    success = await family_tree_crud.add_collaborator_to_tree(db, tree_id=tree_id, collaborator_user_id=collaborator_user_id_to_add)
    if not success:
        # Could be already a collaborator, or other issue. add_collaborator_to_tree uses $addToSet.
        if collaborator_user_id_to_add in tree.collaborator_ids:
             return {"message": "User is already a collaborator."} # Or return 200 OK
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to add collaborator.")

    # TODO: Create a notification for the added collaborator
    # from app.services.notification_service import create_new_collaborator_notification
    # await create_new_collaborator_notification(db, tree, current_user_id, collaborator_user_id_to_add)

    return {"message": "Collaborator added successfully."}


@router.delete("/{tree_id}/collaborators/{collaborator_user_id_str}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_collaborator(
    tree_id: PyObjectId,
    collaborator_user_id_str: str, # Path param is string
    db: AsyncIOMotorDatabase = Depends(get_db_dependency),
    current_user_id: uuid.UUID = CurrentUserUUID
):
    try:
        collaborator_user_id = uuid.UUID(collaborator_user_id_str)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid collaborator user ID format.")

    tree = await family_tree_crud.get_family_tree_by_id(db, tree_id=tree_id)
    if not tree:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Family tree not found.")
    if tree.owner_id != current_user_id: # Only owner can remove collaborators
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the owner can remove collaborators.")

    if collaborator_user_id == tree.owner_id: # Should not happen if UI prevents this
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Owner cannot be removed as a collaborator.")

    success = await family_tree_crud.remove_collaborator_from_tree(db, tree_id=tree_id, collaborator_user_id=collaborator_user_id)
    if not success:
        # Could be user was not a collaborator, or other issue.
        if collaborator_user_id not in tree.collaborator_ids:
            return Response(status_code=status.HTTP_204_NO_CONTENT) # Effectively, they are removed or were never there
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to remove collaborator.")

    # TODO: Create a notification for the removed collaborator (optional)
    return Response(status_code=status.HTTP_204_NO_CONTENT)

from fastapi import Response # for 204 status code return type. Already imported.
