from fastapi import APIRouter, Depends, HTTPException, status, Query
from motor.motor_asyncio import AsyncIOMotorDatabase
import uuid # For user_id
from typing import List, Optional

from app.db.database import get_db_dependency
from app.crud import relationship_crud, person_crud # Need person_crud to validate persons exist
from app.schemas import relationship_schema, PaginatedResponse # Assuming PaginatedResponse might be used
from app.models.base_model import PyObjectId
from app.middleware.auth_middleware import get_current_active_user_id_dependency
from app.api.v1.person_router import get_authorized_family_tree # Reuse helper from person_router for tree auth
from app.crud.family_tree_crud import FamilyTreeModel # For type hint
from app.utils.logger import logger


CurrentUserUUID = Depends(get_current_active_user_id_dependency)

router = APIRouter()

@router.post("/", response_model=relationship_schema.RelationshipResponseSchema, status_code=status.HTTP_201_CREATED)
async def create_relationship(
    relationship_in: relationship_schema.RelationshipCreateSchema,
    db: AsyncIOMotorDatabase = Depends(get_db_dependency),
    current_user_id: uuid.UUID = CurrentUserUUID
):
    # Authorize access to the family tree
    family_tree = await get_authorized_family_tree(relationship_in.family_tree_id, db, current_user_id)
    # TODO: Check write permissions if collaborator roles are implemented

    # Validate that person1_id and person2_id exist and belong to this family tree
    person1 = await person_crud.get_person_by_id(db, person_id=relationship_in.person1_id)
    person2 = await person_crud.get_person_by_id(db, person_id=relationship_in.person2_id)

    if not person1 or str(person1.family_tree_id) != str(family_tree.id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Person with ID {relationship_in.person1_id} not found in this family tree.")
    if not person2 or str(person2.family_tree_id) != str(family_tree.id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Person with ID {relationship_in.person2_id} not found in this family tree.")

    # Additional business logic for relationship creation (e.g., prevent duplicate marriages)
    # This might be better in a service layer.

    created_relationship = await relationship_crud.create_relationship(db, relationship_data=relationship_in)
    if not created_relationship:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to create relationship.")
    return created_relationship

@router.get("/by-tree/{family_tree_id}", response_model=List[relationship_schema.RelationshipResponseSchema])
async def list_relationships_in_tree(
    family_tree: FamilyTreeModel = Depends(get_authorized_family_tree), # Path param handled by dependency
    db: AsyncIOMotorDatabase = Depends(get_db_dependency),
    # Add pagination if needed:
    # page: int = Query(1, ge=1),
    # size: int = Query(100, ge=1, le=1000) # Relationships can be numerous
):
    # skip = (page - 1) * size
    # For now, fetching all, add pagination later if performance dictates
    relationships = await relationship_crud.get_relationships_in_family_tree(db, family_tree_id=family_tree.id, limit=0) # limit=0 means no limit by Motor convention
    return relationships
    # return PaginatedResponse(items=relationships, total=len(relationships), page=page, size=len(relationships) if size==0 else size)


@router.get("/for-person/{person_id}", response_model=List[relationship_schema.RelationshipResponseSchema])
async def get_relationships_for_a_person(
    person_id: PyObjectId,
    db: AsyncIOMotorDatabase = Depends(get_db_dependency),
    current_user_id: uuid.UUID = CurrentUserUUID # To authorize access to the person's tree
):
    person = await person_crud.get_person_by_id(db, person_id=person_id)
    if not person:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Person not found.")

    # Authorize access via the person's family tree
    await get_authorized_family_tree(person.family_tree_id, db, current_user_id)

    relationships = await relationship_crud.get_relationships_for_person(db, person_id=person_id, family_tree_id=person.family_tree_id)
    return relationships


@router.get("/{relationship_id}", response_model=relationship_schema.RelationshipResponseSchema)
async def get_relationship(
    relationship_id: PyObjectId,
    db: AsyncIOMotorDatabase = Depends(get_db_dependency),
    current_user_id: uuid.UUID = CurrentUserUUID # To authorize access
):
    relationship = await relationship_crud.get_relationship_by_id(db, relationship_id=relationship_id)
    if not relationship:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Relationship not found.")

    # Authorize access via the relationship's family tree
    await get_authorized_family_tree(relationship.family_tree_id, db, current_user_id)
    return relationship

@router.put("/{relationship_id}", response_model=relationship_schema.RelationshipResponseSchema)
async def update_relationship_details(
    relationship_id: PyObjectId,
    relationship_update: relationship_schema.RelationshipUpdateSchema,
    db: AsyncIOMotorDatabase = Depends(get_db_dependency),
    current_user_id: uuid.UUID = CurrentUserUUID
):
    relationship = await relationship_crud.get_relationship_by_id(db, relationship_id=relationship_id)
    if not relationship:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Relationship not found.")

    # Authorize access and write permission via the relationship's family tree
    family_tree = await get_authorized_family_tree(relationship.family_tree_id, db, current_user_id)
    # TODO: Check if user has write permissions (e.g. owner or editor collaborator)
    if family_tree.owner_id != current_user_id: # Basic check
        pass # Allow collaborators for now

    updated_relationship = await relationship_crud.update_relationship(db, relationship_id=relationship_id, update_data=relationship_update)
    if not updated_relationship:
        check_rel = await relationship_crud.get_relationship_by_id(db, relationship_id=relationship_id)
        if check_rel: return check_rel # No change or error during update but doc exists
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Relationship not found or update failed.")
    return updated_relationship

@router.delete("/{relationship_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_relationship(
    relationship_id: PyObjectId,
    db: AsyncIOMotorDatabase = Depends(get_db_dependency),
    current_user_id: uuid.UUID = CurrentUserUUID
):
    relationship = await relationship_crud.get_relationship_by_id(db, relationship_id=relationship_id)
    if not relationship:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Relationship not found.")

    # Authorize access and write permission via the relationship's family tree
    family_tree = await get_authorized_family_tree(relationship.family_tree_id, db, current_user_id)
    # TODO: Check if user has write permissions
    if family_tree.owner_id != current_user_id: # Basic check
        pass # Allow collaborators for now

    deleted = await relationship_crud.delete_relationship(db, relationship_id=relationship_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to delete relationship.")

    return Response(status_code=status.HTTP_204_NO_CONTENT)

from fastapi import Response # For 204 status code return type. Already imported.
