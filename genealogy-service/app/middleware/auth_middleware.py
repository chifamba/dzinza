from fastapi import Request, HTTPException, Depends, status
from fastapi.security import OAuth2PasswordBearer # Or just parse Authorization header manually
from jose import jwt, JWTError
from pydantic import ValidationError
import uuid

from app.core.config import settings
from app.utils.logger import logger
# from app.schemas.token_schema import TokenPayload # If you have a shared token payload schema

# This scheme can be used if the service itself exposes a token URL, which it doesn't.
# It's more about where the client *would* get the token.
# For inter-service auth, we usually just check the "Authorization: Bearer <token>" header.
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False) # auto_error=False means it won't raise 401 if header missing

class AuthError(Exception):
    def __init__(self, detail: str, status_code: int = status.HTTP_401_UNAUTHORIZED):
        self.detail = detail
        self.status_code = status_code

async def get_current_user_id_from_token(token: Optional[str] = Depends(oauth2_scheme)) -> uuid.UUID:
    """
    Dependency to validate JWT and extract user ID.
    This is the actual implementation for `get_current_active_user_id_dependency`
    used in routers.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if token is None:
        # If oauth2_scheme has auto_error=True, it would raise before this.
        # If auto_error=False, token can be None if Authorization header is missing or malformed.
        logger.debug("Authorization token not found in request.")
        raise credentials_exception

    try:
        payload = jwt.decode(
            token,
            settings.AUTH_SERVICE_JWT_SECRET_KEY, # Use the key from auth-service
            algorithms=[settings.ALGORITHM]
        )

        # Check token type if your auth-service includes it in the payload
        token_type: Optional[str] = payload.get("type")
        if token_type and token_type != "access":
            logger.warning(f"Invalid token type received: {token_type}")
            raise credentials_exception # Or a more specific error

        user_id_str: Optional[str] = payload.get("sub")
        if user_id_str is None:
            logger.warning("User ID (sub) not found in token payload.")
            raise credentials_exception

        try:
            user_id = uuid.UUID(user_id_str)
        except ValueError:
            logger.warning(f"Invalid user ID format in token: {user_id_str}")
            raise credentials_exception

        # Optional: Validate payload against a Pydantic schema if you have one for tokens
        # from app.schemas.token_schema import TokenPayload # Assuming shared or replicated schema
        # try:
        #     token_data = TokenPayload(**payload)
        # except ValidationError as e:
        #     logger.warning(f"Token payload validation error: {e}")
        #     raise credentials_exception

        # Here, you might also want to check if the user is active by calling auth-service
        # or checking a local cache/replicated user table, if performance is critical.
        # For now, just extracting user_id. The assumption is auth-service issues tokens only for active users.

        return user_id

    except JWTError as e: # Catches expired signature, invalid signature, etc.
        logger.warning(f"JWT Error: {e}")
        raise credentials_exception
    except Exception as e: # Catch any other unexpected errors during token processing
        logger.error(f"Unexpected error during token validation: {e}", exc_info=True)
        raise credentials_exception


# This is the dependency that should be imported and used by routers.
# It can be aliased in routers for brevity, e.g., CurrentUserID = Depends(get_current_active_user_id_dependency)
get_current_active_user_id_dependency = get_current_user_id_from_token


# Example of a middleware that could protect all routes (alternative to per-route dependency)
# from starlette.middleware.base import BaseHTTPMiddleware
# class JWTAuthMiddleware(BaseHTTPMiddleware):
#     async def dispatch(self, request: Request, call_next):
#         if any(request.url.path.startswith(p) for p in ["/openapi.json", "/docs", "/metrics", "/health"]):
#             return await call_next(request) # Skip auth for public paths

#         auth_header = request.headers.get("Authorization")
#         if not auth_header or not auth_header.startswith("Bearer "):
#             return JSONResponse(
#                 status_code=status.HTTP_401_UNAUTHORIZED,
#                 content={"detail": "Not authenticated"}
#             )
#
#         token = auth_header.split("Bearer ")[1]
#         try:
#             user_id = await get_current_user_id_from_token(token) # This needs adjustment as get_current_user_id_from_token is a Depends
#             # A direct validation function would be needed here.
#             # request.state.current_user_id = user_id
#         except HTTPException as e:
#             return JSONResponse(status_code=e.status_code, content={"detail": e.detail})
#
#         response = await call_next(request)
#         return response

# For now, using per-route dependency injection is cleaner and more common with FastAPI.
# The placeholder in routers should be replaced by importing `get_current_active_user_id_dependency` from here.

# To make the placeholder in routers work correctly, they should import this:
# from app.middleware.auth_middleware import get_current_active_user_id_dependency
# And then use: CurrentUserUUID = Depends(get_current_active_user_id_dependency)
# I will go back and update the routers after creating main.py for this service.
