from fastapi import Request, HTTPException, Depends, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
import uuid
from typing import Optional

from app.core.config import settings
from app.utils.logger import logger

# tokenUrl is not strictly used by this service for issuing tokens,
# but OAuth2PasswordBearer requires it. It points to where client would get token.
# auto_error=False means it won't raise 401 if Authorization header is missing.
# This allows routes to make authentication optional.
oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/login", auto_error=False) # Dummy URL from auth perspective

async def get_current_user_id_from_token(token: Optional[str] = Depends(oauth2_scheme)) -> Optional[uuid.UUID]:
    """
    Dependency to validate JWT and extract user ID.
    Returns user_id if token is valid, None otherwise (if token is missing and auto_error=False).
    Raises HTTPException for invalid/expired tokens.
    """
    if token is None: # No token provided, and auto_error=False
        return None

    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(
            token,
            settings.AUTH_SERVICE_JWT_SECRET_KEY,
            algorithms=[settings.ALGORITHM]
        )
        token_type: Optional[str] = payload.get("type")
        if token_type and token_type != "access": # Ensure it's an access token
            logger.warning(f"Invalid token type received: {token_type} (search-service)")
            raise credentials_exception

        user_id_str: Optional[str] = payload.get("sub")
        if user_id_str is None:
            logger.warning("User ID (sub) not found in token payload (search-service).")
            raise credentials_exception

        try:
            user_id = uuid.UUID(user_id_str)
        except ValueError:
            logger.warning(f"Invalid user ID format in token: {user_id_str} (search-service)")
            raise credentials_exception
        return user_id

    except JWTError as e: # Handles expired, invalid signature, etc.
        logger.warning(f"JWT Error in search-service: {e}")
        raise credentials_exception
    except Exception as e: # Catch-all for other unexpected errors
        logger.error(f"Unexpected error during token validation in search-service: {e}", exc_info=True)
        raise credentials_exception

# This is the primary dependency for routes needing user ID.
# It can be made strictly required by removing `Optional` from return type
# and ensuring `oauth2_scheme` has `auto_error=True` or by raising if token is None.
get_current_active_user_id_dependency = get_current_user_id_from_token


# For Admin routes, a more specific dependency would be needed, e.g.:
async def get_current_admin_user_id_dependency(user_id: Optional[uuid.UUID] = Depends(get_current_user_id_from_token)) -> uuid.UUID:
    if user_id is None: # If token was optional and not provided, but admin endpoint requires it.
         raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required for admin access.")

    # Actual admin role check needed here:
    # 1. Fetch user role from Auth service using user_id.
    # 2. If not admin, raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User does not have admin privileges")
    logger.warning(f"Admin endpoint accessed by user {user_id}. ROLE CHECK IS A PLACEHOLDER (search-service).")
    # This is NOT secure for production without actual role validation.
    return user_id
