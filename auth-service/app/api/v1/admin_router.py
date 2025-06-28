from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
import uuid
from typing import List, Optional

from app.crud import user_crud
from app.db.database import get_db_session
from app.db.models.user_model import User, UserRole
from app.schemas import user_schema # Using UserResponse, AdminUserUpdate, UserListResponse

# Placeholder for authentication and authorization dependencies
async def get_current_active_user(user: User = Depends(lambda: None)) -> User: # Simplified for now
    if not user or not user.is_active: # This needs to be a real auth check
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated or inactive user")
    return user

async def get_current_admin_user(current_user: User = Depends(get_current_active_user)) -> User:
    if current_user.role not in [UserRole.ADMIN, UserRole.SUPER_ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="The user doesn't have enough privileges"
        )
    return current_user

router = APIRouter()

@router.get("/users", response_model=user_schema.UserListResponse)
async def list_users(
    db: AsyncSession = Depends(get_db_session),
    current_admin: User = Depends(get_current_admin_user),
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(10, ge=1, le=100, description="Page size"),
    # Add filter parameters as needed, e.g., email, role, is_active
    email: Optional[str] = Query(None, description="Filter by email (contains)"),
    role: Optional[UserRole] = Query(None, description="Filter by role"),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
):
    # Basic pagination for now. Complex filtering would require more sophisticated queries.
    skip = (page - 1) * size
    users = await user_crud.get_users(db, skip=skip, limit=size) # This basic get_users needs enhancement for filtering
    total_users = await user_crud.get_users_count(db) # This basic count needs enhancement for filtering

    # TODO: Enhance user_crud.get_users and get_users_count to support filtering
    # For now, returning unfiltered paginated list.

    return user_schema.UserListResponse(
        items=[user_schema.UserResponse.model_validate(user) for user in users],
        total=total_users,
        page=page,
        size=size
    )

@router.get("/users/{user_id}", response_model=user_schema.UserResponse) # Or a more detailed AdminUserResponse
async def get_user_by_id_admin(
    user_id: uuid.UUID,
    db: AsyncSession = Depends(get_db_session),
    current_admin: User = Depends(get_current_admin_user)
):
    user = await user_crud.get_user_by_id(db, user_id=user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user_schema.UserResponse.model_validate(user)


@router.put("/users/{user_id}", response_model=user_schema.UserResponse)
async def update_user_admin(
    user_id: uuid.UUID,
    user_in: user_schema.AdminUserUpdate, # Schema for admin updates
    db: AsyncSession = Depends(get_db_session),
    current_admin: User = Depends(get_current_admin_user)
):
    user_to_update = await user_crud.get_user_by_id(db, user_id=user_id)
    if not user_to_update:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    # Prevent admin from accidentally making themselves a non-admin or super_admin demoting another super_admin
    if user_to_update.id == current_admin.id and 'role' in user_in.model_fields_set:
        if user_in.role not in [UserRole.ADMIN, UserRole.SUPER_ADMIN]:
             raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot remove your own admin privileges.")

    if user_to_update.role == UserRole.SUPER_ADMIN and user_to_update.id != current_admin.id:
        if current_admin.role != UserRole.SUPER_ADMIN:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only Super Admins can modify other Super Admins.")
        if 'role' in user_in.model_fields_set and user_in.role != UserRole.SUPER_ADMIN:
             raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Super Admin role cannot be demoted by another Super Admin via this endpoint.")


    updated_user = await user_crud.update_user(db, user=user_to_update, user_in=user_in)
    return user_schema.UserResponse.model_validate(updated_user)


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user_admin(
    user_id: uuid.UUID,
    db: AsyncSession = Depends(get_db_session),
    current_admin: User = Depends(get_current_admin_user)
):
    user_to_delete = await user_crud.get_user_by_id(db, user_id=user_id)
    if not user_to_delete:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if user_to_delete.id == current_admin.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot delete your own account via admin panel.")

    if user_to_delete.role == UserRole.SUPER_ADMIN and current_admin.role != UserRole.SUPER_ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only Super Admins can delete other Super Admins.")

    success = await user_crud.delete_user(db, user_id=user_id)
    if not success:
        # This case should ideally not happen if user_to_delete was found
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to delete user.")

    return Response(status_code=status.HTTP_204_NO_CONTENT)


# Placeholder for other admin actions:
# - Manually verify a user's email
# - Trigger password reset for a user
# - View audit logs related to a user
# - Impersonate user (with extreme caution and auditing)

@router.post("/users/{user_id}/verify-email", response_model=user_schema.UserResponse)
async def admin_verify_user_email(
    user_id: uuid.UUID,
    db: AsyncSession = Depends(get_db_session),
    current_admin: User = Depends(get_current_admin_user)
):
    user = await user_crud.get_user_by_id(db, user_id=user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if user.is_verified:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User email is already verified.")

    verified_user = await user_crud.verify_user_email(db, user=user)
    return user_schema.UserResponse.model_validate(verified_user)
