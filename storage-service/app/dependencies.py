from fastapi import Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer
from typing import Optional
import structlog # Import structlog

from app.config import settings

logger = structlog.get_logger(__name__)

# Minimal User model representation within this service from token info
class AuthenticatedUser:
    def __init__(self, id: str, email: Optional[str] = None, roles: Optional[list[str]] = None):
        self.id = id
        self.email = email
        self.roles = roles if roles else []
        self.is_active = True # Assume active if token is valid and not explicitly marked inactive

# OAuth2 scheme. For services that *validate* tokens rather than issue them,
# the tokenUrl is less critical but should point to where tokens are obtained for documentation.
# If this service calls auth-service to validate, this scheme might not be used directly for validation logic.
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login") # Points to auth-service's login

async def get_current_user(token: str = Depends(oauth2_scheme)) -> AuthenticatedUser:
    """
    Dependency to simulate getting the current user from a JWT token.
    In a real microservice architecture:
    1. API Gateway might validate the token and pass user info (ID, roles) in headers.
    2. This service might call an Auth service introspection endpoint.
    3. This service might validate the JWT locally if it has the public key / shared secret.

    For this migration step, we'll simulate option 3 (local validation) if a JWT_SECRET is found,
    otherwise, we'll use a mock for any token.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    # Use the assembled JWT secret which handles file path or direct env var
    jwt_secret = settings.ASSEMBLED_JWT_SECRET

    if jwt_secret:
        from jose import JWTError, jwt
        # No need for TokenPayload schema from auth-service, parse keys directly.
        # MinimalTokenPayload class removed.

        try:
            payload = jwt.decode(
                token,
                jwt_secret, # Use the assembled secret
                algorithms=[settings.JWT_ALGORITHM], # Assumes JWT_ALGORITHM is always set
                audience=settings.JWT_AUDIENCE # Can be None if not configured
            )

            user_id = payload.get("user_id", payload.get("sub"))
            if user_id is None:
                logger.warning("Token payload missing 'user_id' or 'sub'.", token_payload=payload)
                raise credentials_exception

            email = payload.get("email")
            # Handle roles: could be a list, a single string, or absent
            roles_from_payload = payload.get("roles")
            if isinstance(roles_from_payload, str):
                actual_roles = [roles_from_payload]
            elif isinstance(roles_from_payload, list):
                actual_roles = [str(r) for r in roles_from_payload if r is not None] # Ensure roles are strings
            else: # If 'roles' is not present or not a list/str, check 'role'
                role_from_payload = payload.get("role")
                if isinstance(role_from_payload, str):
                    actual_roles = [role_from_payload]
                else:
                    actual_roles = []

            logger.debug("JWT decoded successfully.", user_id=user_id, email=email, roles=actual_roles)
            return AuthenticatedUser(id=str(user_id), email=email, roles=actual_roles)

        except JWTError as e:
            logger.warning("JWT validation error.", error=str(e), token_type="Bearer")
            raise credentials_exception
        except Exception as e: # Catch-all for other potential errors during decode
            logger.error("Unexpected error decoding JWT.", error=str(e), exc_info=True)
            raise credentials_exception
    else:
        logger.error("JWT_SECRET not configured for storage-service. Authentication cannot be performed.")
        # In a strict setup, always raise credentials_exception if no secret.
        # The mock logic below is only for very specific local dev scenarios and should be removed for production.
        # For now, keeping the mock path but emphasizing it's a dev-only fallback.
        if settings.DEBUG and token.startswith("mock_token_"): # Simple mock token check, only in DEBUG
            logger.warning("Using mock authentication due to missing JWT_SECRET in DEBUG mode.")
            user_id_from_mock = token.split("mock_token_")[-1]
            return AuthenticatedUser(id=user_id_from_mock, email=f"{user_id_from_mock}@example.com", roles=["user"])

        # If not DEBUG or not a mock token, and no secret, then it's a hard fail.
        raise credentials_exception


async def get_current_active_user(
    current_user: AuthenticatedUser = Depends(get_current_user)
) -> AuthenticatedUser:
    """
    Dependency to get the current_user and ensure they are marked as active.
    (In this simplified AuthenticatedUser, is_active is assumed True if token is valid).
    """
    # If AuthenticatedUser had an is_active field from token:
    # if not current_user.is_active:
    #     raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Inactive user")
    return current_user

# Example: If you need an admin check for some storage operations
# def require_admin_role(current_user: AuthenticatedUser = Depends(get_current_active_user)):
#     if "admin" not in current_user.roles:
#         raise HTTPException(
#             status_code=status.HTTP_403_FORBIDDEN,
#             detail="User does not have admin privileges."
#         )
#     return current_user
