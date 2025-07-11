from fastapi import Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
import uuid
from typing import Optional

from app import crud, models, schemas, utils
from app.database import get_db
from app.config import settings

# OAuth2PasswordBearer takes the URL where the client will send username and password to get a token
# This should point to your login endpoint.
# Ensure the prefix matches how your router is included in main.py
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/v1/auth/login")

async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> models.User:
    """
    Dependency to get the current user from a JWT token.
    Raises HTTPException if the token is invalid or the user is not found.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    token_payload: Optional[schemas.TokenPayload] = utils.decode_token(token, settings.ASSEMBLED_JWT_SECRET)

    if token_payload is None or token_payload.user_id is None:
        raise credentials_exception

    user_id_str = token_payload.user_id
    try:
        if not isinstance(user_id_str, str):
             raise ValueError("User ID in token is not a valid string format for UUID.")
        user_id_uuid = uuid.UUID(user_id_str)
    except ValueError:
        raise credentials_exception

    user = crud.get_user(db, user_id=user_id_uuid)
    if user is None:
        raise credentials_exception
    return user

async def get_current_active_user(
    current_user: models.User = Depends(get_current_user)
) -> models.User:
    """
    Dependency to get the current active user.
    Raises HTTPException if the user is inactive.
    """
    if not current_user.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Inactive user")
    return current_user

async def get_current_active_superuser( # Renamed from get_current_superuser to match common pattern
    current_user: models.User = Depends(get_current_active_user)
) -> models.User:
    """
    Dependency to get the current active superuser (admin).
    Raises HTTPException if the user is not a superuser/admin.
    """
    if not current_user.is_superuser and current_user.role != models.UserRole.ADMIN:
         raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="The user doesn't have enough privileges"
        )
    return current_user

# Need to define oauth2_scheme_optional that doesn't raise error if token is missing
from fastapi.security.utils import get_authorization_scheme_param

class OptionalOAuth2PasswordBearer(OAuth2PasswordBearer):
    async def __call__(self, request: Request) -> Optional[str]:
        authorization: Optional[str] = request.headers.get("Authorization")
        if not authorization:
            return None # No token provided, okay for optional

        scheme, param = get_authorization_scheme_param(authorization)
        if scheme.lower() != "bearer":
            if self.auto_error: # If auto_error is true and scheme is wrong, it's an error
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Not authenticated (invalid scheme)",
                    headers={"WWW-Authenticate": "Bearer"},
                )
            else: # If auto_error is false, and scheme is wrong, still treat as no valid token
                return None
        return param # Return the token part

oauth2_scheme_optional = OptionalOAuth2PasswordBearer(tokenUrl="api/v1/auth/login", auto_error=False)

async def get_optional_current_user(
    token: Optional[str] = Depends(oauth2_scheme_optional),
    db: Session = Depends(get_db)
) -> Optional[models.User]:
    """
    Dependency to optionally get the current user.
    If a token is provided and valid, returns the user. Otherwise, returns None.
    Does not raise an exception for missing or invalid token if it's simply not provided.
    """
    if not token:
        return None
    try:
        # Re-use get_current_user logic, but catch its specific exception for invalid/expired token
        # This is a bit indirect. A direct decode and fetch might be cleaner here for optional.
        token_payload: Optional[schemas.TokenPayload] = utils.decode_token(token, settings.ASSEMBLED_JWT_SECRET)
        if token_payload is None or token_payload.user_id is None:
            return None # Invalid token payload

        user_id_str = token_payload.user_id
        try:
            if not isinstance(user_id_str, str):
                return None # Invalid user_id format
            user_id_uuid = uuid.UUID(user_id_str)
        except ValueError:
            return None # Invalid UUID format

        user = crud.get_user(db, user_id=user_id_uuid)
        # Do not check for is_active here, let endpoint decide if activity matters for optional user
        return user
    except HTTPException as e:
        # If get_current_user would have raised an auth error, we return None for optional.
        if e.status_code == status.HTTP_401_UNAUTHORIZED:
            return None
        raise # Re-raise other unexpected HTTPExceptions
    except Exception: # Catch any other error during token processing for optional user
        return None


# Example of a role-based access control dependency
def require_role(required_role: models.UserRole):
    async def role_checker(current_user: models.User = Depends(get_current_active_user)) -> models.User:
        # Allow is_superuser to satisfy ADMIN role requirement
        if required_role == models.UserRole.ADMIN and current_user.is_superuser:
            return current_user

        if current_user.role != required_role:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"User role '{current_user.role.value if current_user.role else 'N/A'}' is not authorized. Requires '{required_role.value}'.",
            )
        return current_user
    return role_checker
