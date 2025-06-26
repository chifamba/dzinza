from fastapi import Request, HTTPException, Depends, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
import uuid
from typing import Optional

from app.core.config import settings
from app.utils.logger import logger

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False) # From auth-service

async def get_current_user_id_from_token(token: Optional[str] = Depends(oauth2_scheme)) -> uuid.UUID:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if token is None:
        logger.debug("Authorization token not found in request (storage-service).")
        raise credentials_exception

    try:
        payload = jwt.decode(
            token,
            settings.AUTH_SERVICE_JWT_SECRET_KEY,
            algorithms=[settings.ALGORITHM]
        )
        token_type: Optional[str] = payload.get("type")
        if token_type and token_type != "access":
            logger.warning(f"Invalid token type received: {token_type} (storage-service)")
            raise credentials_exception

        user_id_str: Optional[str] = payload.get("sub")
        if user_id_str is None:
            logger.warning("User ID (sub) not found in token payload (storage-service).")
            raise credentials_exception

        try:
            user_id = uuid.UUID(user_id_str)
        except ValueError:
            logger.warning(f"Invalid user ID format in token: {user_id_str} (storage-service)")
            raise credentials_exception
        return user_id

    except JWTError as e:
        logger.warning(f"JWT Error in storage-service: {e}")
        raise credentials_exception
    except Exception as e:
        logger.error(f"Unexpected error during token validation in storage-service: {e}", exc_info=True)
        raise credentials_exception

get_current_active_user_id_dependency = get_current_user_id_from_token

# For Admin routes, a more specific dependency would be needed, e.g.:
# async def get_current_admin_user_id_dependency(user_id: uuid.UUID = Depends(get_current_user_id_from_token)) -> uuid.UUID:
#     # 1. Fetch user role from Auth service using user_id (requires service-to-service call or shared DB/cache)
#     #    is_admin = await auth_service_client.check_is_admin(user_id)
#     # 2. If not admin, raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User does not have admin privileges")
#     # For now, the admin router placeholder uses a simplified check or assumes the token itself implies admin if it were a special admin token.
#     # This part needs proper implementation for real admin role checking.
#     # As a placeholder for now, if the admin routes are hit, we just trust the `get_current_user_id_from_token`
#     # and the admin router's placeholder `get_current_admin_user_id_dependency` would need to be updated
#     # to use this and then perform the actual role check.
#     # For this conversion, we'll assume the admin placeholder in admin_router is sufficient for structure.
#     logger.info(f"Admin access attempt by user {user_id} - ROLE CHECK NEEDED (storage-service)")
#     # This is just a placeholder for the dependency structure.
#     # Real admin check is complex without direct access to user roles.
#     # For now, we'll assume any valid token passes if the admin endpoint is called by an admin client.
#     # This is NOT secure for production without actual role validation.
#     return user_id

# This is the actual dependency that should be used in admin_router.py
# from app.middleware.auth_middleware import get_current_admin_user_id_dependency as get_admin_user
# CurrentAdminUUID = Depends(get_admin_user)
# The admin router currently defines its own placeholder. That needs to be updated.
# For now, this file only provides the basic user ID extraction.
# A proper get_current_admin_user_id_dependency would call auth-service or check a roles claim in JWT.
