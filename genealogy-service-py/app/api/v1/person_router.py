from fastapi import APIRouter, Depends, HTTPException, status, Query, Body
from motor.motor_asyncio import AsyncIOMotorDatabase
import uuid # For user_id
from typing import List, Optional

from app.db.database import get_db_dependency
from app.crud import person_crud, family_tree_crud # Need family_tree_crud for auth checks
from app.schemas import person_schema, PaginatedResponse
from app.models.base_model import PyObjectId
from app.middleware.auth_middleware import get_current_active_user_id_dependency
from app.crud.family_tree_crud import FamilyTreeModel # For type hint
from app.utils.logger import logger


CurrentUserUUID = Depends(get_current_active_user_id_dependency)

router = APIRouter()

# Helper dependency to get and authorize family tree access
async def get_authorized_family_tree(
    tree_id: PyObjectId,
    db: AsyncIOMotorDatabase = Depends(get_db_dependency),
    current_user_id: uuid.UUID = CurrentUserUUID
) -> FamilyTreeModel:
    tree = await family_tree_crud.get_family_tree_by_id(db, tree_id=tree_id)
    if not tree:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Family tree not found.")
    if tree.owner_id != current_user_id and current_user_id not in tree.collaborator_ids:
        # TODO: Consider tree privacy settings for read access
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized for this family tree.")
    return tree


@router.post("/", response_model=person_schema.PersonResponseSchema, status_code=status.HTTP_201_CREATED)
async def create_person_in_tree(
    person_in: person_schema.PersonCreateSchema,
    db: AsyncIOMotorDatabase = Depends(get_db_dependency),
    current_user_id: uuid.UUID = CurrentUserUUID,
    # Ensure family_tree_id in person_in is authorized
    # This can be done by resolving family_tree_id from path or by a dependency
    # For now, assume person_in.family_tree_id is validated by caller or a preceding step.
    # A better way: family_tree_id as path parameter for this endpoint.
):
    # Authorize access to the family tree specified in person_in.family_tree_id
    family_tree = await get_authorized_family_tree(person_in.family_tree_id, db, current_user_id)
    # TODO: Check if user has write permissions (e.g. owner or editor collaborator)
    if family_tree.owner_id != current_user_id: # Basic check, refine with collaborator roles
        # if current_user_id not in editor_collaborators_of_tree...
        pass # Allow collaborators for now, refine with roles

    created_person = await person_crud.create_person(db, person_data=person_in, user_id=current_user_id)
    if not created_person:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to create person.")

    # Update member count in family tree
    await family_tree_crud.update_member_count(db, tree_id=family_tree.id, increment=1)

    return created_person

@router.get("/by-tree/{family_tree_id}", response_model=PaginatedResponse[person_schema.PersonResponseSchema])
async def list_persons_in_tree(
    family_tree: FamilyTreeModel = Depends(get_authorized_family_tree), # Path param handled by dependency
    db: AsyncIOMotorDatabase = Depends(get_db_dependency),
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=200) # Allow more persons per page
):
    skip = (page - 1) * size
    persons = await person_crud.get_persons_by_family_tree_id(db, family_tree_id=family_tree.id, skip=skip, limit=size)
    total_persons = await person_crud.count_persons_in_family_tree(db, family_tree_id=family_tree.id)
    return PaginatedResponse(items=persons, total=total_persons, page=page, size=size)

@router.get("/{person_id}", response_model=person_schema.PersonResponseSchema)
async def get_person(
    person_id: PyObjectId,
    db: AsyncIOMotorDatabase = Depends(get_db_dependency),
    current_user_id: uuid.UUID = CurrentUserUUID # For auth check against person's tree
):
    person = await person_crud.get_person_by_id(db, person_id=person_id)
    if not person:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Person not found.")

    # Authorize access via the person's family tree
    await get_authorized_family_tree(person.family_tree_id, db, current_user_id)
    return person

@router.put("/{person_id}", response_model=person_schema.PersonResponseSchema)
async def update_person_details(
    person_id: PyObjectId,
    person_update: person_schema.PersonUpdateSchema,
    db: AsyncIOMotorDatabase = Depends(get_db_dependency),
    current_user_id: uuid.UUID = CurrentUserUUID
):
    person = await person_crud.get_person_by_id(db, person_id=person_id)
    if not person:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Person not found.")

    # Authorize access and write permission via the person's family tree
    family_tree = await get_authorized_family_tree(person.family_tree_id, db, current_user_id)
    # TODO: Check if user has write permissions (e.g. owner or editor collaborator)
    if family_tree.owner_id != current_user_id: # Basic check
        pass # Allow collaborators for now

    updated_person = await person_crud.update_person(db, person_id=person_id, update_data=person_update, changed_by_user_id=current_user_id)
    if not updated_person:
        # This could happen if update_one reported no modification but person still exists
        check_person = await person_crud.get_person_by_id(db, person_id=person_id)
        if check_person: return check_person
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Person not found or update failed.")
    return updated_person

@router.delete("/{person_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_person_from_tree(
    person_id: PyObjectId,
    db: AsyncIOMotorDatabase = Depends(get_db_dependency),
    current_user_id: uuid.UUID = CurrentUserUUID
):
    person = await person_crud.get_person_by_id(db, person_id=person_id)
    if not person:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Person not found.")

    # Authorize access and write permission via the person's family tree
    family_tree = await get_authorized_family_tree(person.family_tree_id, db, current_user_id)
    # TODO: Check if user has write permissions (e.g. owner or editor collaborator)
    if family_tree.owner_id != current_user_id: # Basic check
        pass # Allow collaborators for now

    # Deleting a person should also remove their relationships
    from app.crud import relationship_crud # Avoid circular import at top level
    await relationship_crud.delete_relationships_for_person(db, person_id=person_id, family_tree_id=family_tree.id)

    deleted = await person_crud.delete_person(db, person_id=person_id, changed_by_user_id=current_user_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to delete person.")

    # Update member count in family tree
    await family_tree_crud.update_member_count(db, tree_id=family_tree.id, increment=-1)

    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/search/by-tree/{family_tree_id}", response_model=List[person_schema.PersonResponseSchema])
async def search_persons_in_tree(
    family_tree: FamilyTreeModel = Depends(get_authorized_family_tree),
    name_query: str = Query(..., min_length=1, description="Name to search for"),
    db: AsyncIOMotorDatabase = Depends(get_db_dependency),
    limit: int = Query(20, ge=1, le=100)
):
    # Basic search, uses regex on denormalized full_name_searchable
    persons = await person_crud.search_persons_by_name(db, family_tree_id=family_tree.id, name_query=name_query, limit=limit)
    return persons

# TODO: Endpoints for Person History (e.g., GET /persons/{person_id}/history)

from fastapi import Response # For 204 status code return type. Already imported.
