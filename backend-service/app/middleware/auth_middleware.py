from fastapi import Request, HTTPException, Depends, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
import uuid
from typing import Optional

from app.core.config import settings
from app.utils.logger import logger # Assuming logger is set up

# This scheme is used to extract the token. auto_error=False makes it optional.
# If settings.AUTH_SERVICE_JWT_SECRET_KEY is not set, this middleware might just pass through.
oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_PREFIX}/auth/login", auto_error=False) # Dummy tokenUrl

async def get_current_user_id_optional_dependency(token: Optional[str] = Depends(oauth2_scheme)) -> Optional[uuid.UUID]:
    """
    Dependency that attempts to validate JWT and extract user ID if a token is provided.
    If AUTH_SERVICE_JWT_SECRET_KEY is not configured in settings, it effectively bypasses validation
    and returns None, meaning the gateway isn't configured to validate tokens itself.
    Downstream services would then be solely responsible for token validation.
    """
    if not settings.AUTH_SERVICE_JWT_SECRET_KEY or not settings.ALGORITHM:
        # Gateway is not configured to validate tokens, pass-through.
        # Log if a token was present but not validated by gateway.
        if token:
            logger.debug("Gateway: JWT validation skipped (no secret configured). Token will be passed to downstream service.")
        return None

    if token is None: # No token provided by client
        return None

    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials (gateway validation)",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(
            token,
            settings.AUTH_SERVICE_JWT_SECRET_KEY,
            algorithms=[settings.ALGORITHM]
        )
        token_type: Optional[str] = payload.get("type")
        if token_type and token_type != "access":
            logger.warning(f"Gateway: Invalid token type received: {token_type}")
            raise credentials_exception

        user_id_str: Optional[str] = payload.get("sub")
        if user_id_str is None:
            logger.warning("Gateway: User ID (sub) not found in token payload.")
            raise credentials_exception

        try:
            user_id = uuid.UUID(user_id_str)
        except ValueError:
            logger.warning(f"Gateway: Invalid user ID format in token: {user_id_str}")
            raise credentials_exception

        logger.debug(f"Gateway: Token validated successfully for user_id: {user_id}")
        return user_id

    except JWTError as e:
        logger.warning(f"Gateway: JWT Error: {e} (token might be invalid or expired)")
        # Depending on policy, gateway could reject here or let downstream service decide.
        # For now, if configured to validate, it should reject invalid/expired tokens.
        raise credentials_exception
    except Exception as e:
        logger.error(f"Gateway: Unexpected error during token validation: {e}", exc_info=True)
        raise credentials_exception


# Example of a stricter dependency that requires authentication
async def require_valid_token_dependency(user_id: Optional[uuid.UUID] = Depends(get_current_user_id_optional_dependency)) -> uuid.UUID:
    if user_id is None:
        # This case is hit if AUTH_SERVICE_JWT_SECRET_KEY was not set (so optional dep returned None),
        # or if token was missing, or if token was invalid and optional dep raised (but it shouldn't if optional).
        # The get_current_user_id_optional_dependency will raise HTTPException for invalid/expired tokens
        # if AUTH_SERVICE_JWT_SECRET_KEY is set.
        # If the key is not set, it returns None.
        # So, if key is not set, this dependency will effectively always fail if it expects a UUID.
        # This needs careful thought: if gateway *must* validate, then AUTH_SERVICE_JWT_SECRET_KEY must be set.
        if not settings.AUTH_SERVICE_JWT_SECRET_KEY:
            logger.error("Gateway: Strict auth required, but JWT secret not configured for gateway validation.")
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Gateway authentication misconfigured.")

        # If key IS set, then get_current_user_id_optional_dependency would have raised 401 for missing/bad token.
        # This path (user_id is None when key is set) should ideally not be reached if oauth2_scheme(auto_error=True) was used
        # or if the optional dependency correctly raises on error.
        # Let's assume if user_id is None here, it means no valid token was found by the optional dependency logic.
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated (gateway check)"
        )
    return user_id


# The routers currently use a placeholder that mimics `get_current_user_id_optional_dependency`.
# They should be updated to import and use `get_current_user_id_optional_dependency` from this file.
# If specific routes proxied by the gateway *require* auth to be checked at the gateway level,
# they could use `Depends(require_valid_token_dependency)`.
# However, it's often cleaner for the gateway to either:
#   a) Validate all tokens if configured (and reject if invalid).
#   b) Pass all Authorization headers through and let downstream services validate.
# Option (a) is what `get_current_user_id_optional_dependency` tries to do if secret is set.
# If secret is not set, it's option (b).
# The current placeholder in `gateway_router.py` is compatible with this.

# Note: If the gateway validates tokens, it might add verified user info to request state or custom headers
# for downstream services to consume, potentially saving them from re-validating.
# e.g., `request.state.current_user_id = user_id` or `headers_to_forward["X-Authenticated-User-Id"] = str(user_id)`
# This is not implemented here yet.
