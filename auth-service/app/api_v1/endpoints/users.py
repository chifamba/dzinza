from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List # Import List

from app import crud, models, schemas
from app.database import get_db
from app.dependencies import get_current_active_user, get_current_active_superuser

router = APIRouter()

@router.get("/me", response_model=schemas.UserResponse)
async def read_users_me(current_user: models.User = Depends(get_current_active_user)):
    """
    Get current logged-in user's details.
    """
    return current_user

@router.put("/me", response_model=schemas.UserResponse)
async def update_users_me(
    user_in: schemas.UserUpdate, # Use a specific schema for user self-update
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    """
    Update current logged-in user's details.
    Users cannot change their role, is_active, or is_superuser status via this endpoint.
    """
    # Ensure users cannot escalate privileges or change critical status fields themselves
    if user_in.role is not None and user_in.role != current_user.role:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot change own role.")
    if user_in.is_active is not None and user_in.is_active != current_user.is_active:
         raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot change own active status.")
    # is_superuser is not typically in UserUpdate schema for self-service for safety

    # Prevent email change if it's not allowed or needs special handling (e.g., re-verification)
    if user_in.email and user_in.email != current_user.email:
        existing_user = crud.get_user_by_email(db, email=user_in.email)
        if existing_user and existing_user.id != current_user.id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered by another user.")
        # If allowing email change, ensure email_verified is set to False
        # current_user.email_verified = False # This should be handled in crud.update_user

    # Prevent username change if it's not allowed or needs special handling
    if user_in.username and user_in.username != current_user.username:
        existing_user = crud.get_user_by_username(db, username=user_in.username)
        if existing_user and existing_user.id != current_user.id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username already taken.")

    updated_user = crud.update_user(db=db, db_user=current_user, user_update=user_in)
    return updated_user

# Admin routes for user management (example)
@router.get("/", response_model=List[schemas.UserResponse], dependencies=[Depends(get_current_active_superuser)])
async def read_users(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    # current_admin: models.User = Depends(get_current_active_superuser) # Dependency ensures admin
):
    """
    Retrieve all users. (Admin only)
    """
    users = crud.get_users(db, skip=skip, limit=limit)
    return users

@router.get("/{user_id}", response_model=schemas.UserResponse, dependencies=[Depends(get_current_active_superuser)])
async def read_user_by_id(
    user_id: uuid.UUID, # Make sure to import uuid
    db: Session = Depends(get_db),
    # current_admin: models.User = Depends(get_current_active_superuser)
):
    """
    Get a specific user by ID. (Admin only)
    """
    db_user = crud.get_user(db, user_id=user_id)
    if db_user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return db_user

@router.put("/{user_id}", response_model=schemas.UserResponse, dependencies=[Depends(get_current_active_superuser)])
async def update_user_by_admin(
    user_id: uuid.UUID,
    user_in: schemas.AdminUserUpdateRequest, # Admin specific update schema
    db: Session = Depends(get_db),
    # current_admin: models.User = Depends(get_current_active_superuser)
):
    """
    Update a user's details by Admin.
    Allows updating role, is_active, etc.
    """
    db_user = crud.get_user(db, user_id=user_id)
    if db_user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if user_in.email and user_in.email != db_user.email:
        existing_user = crud.get_user_by_email(db, email=user_in.email)
        if existing_user and existing_user.id != user_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered by another user.")

    if user_in.username and user_in.username != db_user.username:
        existing_user = crud.get_user_by_username(db, username=user_in.username)
        if existing_user and existing_user.id != user_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username already taken.")

    # If admin is trying to change password, that should be a separate, more secure endpoint/flow.
    # This endpoint is for general user attribute updates by admin.

    updated_user = crud.update_user(db=db, db_user=db_user, user_update=user_in)
    return updated_user


@router.delete("/{user_id}", response_model=schemas.UserResponse, dependencies=[Depends(get_current_active_superuser)])
async def delete_user_by_admin(
    user_id: uuid.UUID,
    db: Session = Depends(get_db),
    # current_admin: models.User = Depends(get_current_active_superuser)
):
    """
    Delete a user. (Admin only)
    Consider soft delete (mark as inactive) vs hard delete.
    """
    db_user = crud.get_user(db, user_id=user_id)
    if db_user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    # Prevent admin from deleting themselves through this generic endpoint
    # if current_admin.id == user_id:
    #     raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admins cannot delete themselves here.")

    deleted_user_data = schemas.UserResponse.from_orm(db_user) # Capture data before delete for response

    # Option 1: Soft delete
    # crud.set_user_active_status(db, db_user, False)
    # return {"message": "User deactivated successfully"}

    # Option 2: Hard delete (as per current crud.delete_user)
    crud.delete_user(db, db_user=db_user)
    # Note: crud.delete_user returns the (stale) user object.
    # It's better to return a message or the data of the user that was deleted.
    return deleted_user_data # Return the data of the user that was deleted
    # return schemas.MessageResponse(message="User deleted successfully")

# Need to import uuid in this file if using it for type hinting user_id
import uuid
