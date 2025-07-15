# genealogy-service/app/dependencies.py
# Placeholder for common dependencies like get_current_user, get_db_session etc.

# Example:
# from fastapi import Depends, HTTPException, status
# from jose import JWTError, jwt
# from pydantic import BaseModel
# from .core.config import settings

# class TokenData(BaseModel):
#     username: str | None = None

# async def get_current_user(token: str = Depends(settings.OAUTH2_SCHEME)):
#     credentials_exception = HTTPException(
#         status_code=status.HTTP_401_UNAUTHORIZED,
#         detail="Could not validate credentials",
#         headers={"WWW-Authenticate": "Bearer"},
#     )
#     try:
#         payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
#         username: str = payload.get("sub")
#         if username is None:
#             raise credentials_exception
#         token_data = TokenData(username=username)
#     except JWTError:
#         raise credentials_exception
#     # user = get_user(fake_users_db, username=token_data.username) # Replace with actual user fetching
#     # if user is None:
#     #     raise credentials_exception
#     # return user
#     return {"username": token_data.username} # Placeholder return

from fastapi import Depends, HTTPException, status, Request
from pydantic import BaseModel
import httpx
import os

class AuthenticatedUser(BaseModel):
    id: str
    username: str | None = None
    email: str
    first_name: str | None = None
    last_name: str | None = None
    is_active: bool = True
    is_superuser: bool = False
    roles: list[str] = []
    email_verified: bool = False
    
    # Optional fields from auth service
    preferred_language: str | None = None
    timezone: str | None = None
    created_at: str | None = None
    updated_at: str | None = None

async def get_current_active_user(request: Request) -> AuthenticatedUser:
    """
    Dependency to validate the Authorization header with the Auth Service and return user info.
    TEMPORARILY DISABLED: Returns a mock user for development/testing.
    TODO: Re-enable real authentication once auth service integration is stable.
    """
    # For now, return a mock user to allow development to continue
    # This bypasses authentication entirely
    return AuthenticatedUser(
        id="dev-user-123",
        username="dev_user",
        email="dev.user@example.com",
        first_name="Development",
        last_name="User",
        is_active=True,
        is_superuser=True,  # Give dev user admin privileges
        roles=["admin", "user"],
        email_verified=True
    )


def require_role(role: str):
    """
    Placeholder dependency for role-based access control.
    Accepts any role and does nothing for now.
    """
    def dependency(
        current_user: AuthenticatedUser = Depends(get_current_active_user)
    ):
        # In a real implementation, check current_user's roles/permissions here
        if role not in current_user.roles and not current_user.is_superuser:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Insufficient permissions. Required role: {role}",
            )
        return current_user
    return dependency
