from fastapi import Request, HTTPException, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp
import jwt # From PyJWT (python-jose also uses/wraps this or similar)
import structlog
from typing import Optional, List

from app.core.config import settings
# Define a simple user model for request.state, similar to other services' AuthenticatedUser
class AuthenticatedUserState(object):
    def __init__(self, id: str, roles: Optional[List[str]] = None, email: Optional[str] = None):
        self.id = id
        self.roles = roles if roles else []
        self.email = email
        # Add other relevant fields from your JWT payload if needed

logger = structlog.get_logger(__name__)

# Paths that do not require authentication
# These should be relative to the prefix where the gateway router is mounted.
# If gateway router is at /api/v1, and auth login is /api/v1/auth/login,
# then EXEMPT_PATHS should contain "/auth/login" (without the /api/v1 prefix if router handles that)
# This needs to be carefully matched against how paths are processed.
# For now, assuming paths are checked *after* any main app prefix (like /api/v1).
EXEMPT_PATHS: List[str] = [
    # Gateway's own health check
    "/gateway/health", # If API_V1_STR is /api/v1, this becomes /api/v1/gateway/health
    # Auth service public endpoints (assuming "auth" is the prefix for auth service)
    "/auth/login",
    "/auth/register",
    "/auth/refresh",
    "/auth/verify-email", # May need query params
    "/auth/request-password-reset",
    "/auth/reset-password",
    # Publicly accessible parts of other services, if any (e.g., public search, public profiles)
    # Add more paths as needed, e.g., for Swagger docs if exposed, OPTIONS requests.
]

# It's often useful to allow all OPTIONS requests for CORS preflight
# Or handle CORS globally before this middleware.

class AuthMiddleware(BaseHTTPMiddleware):
    def __init__(self, app: ASGIApp):
        super().__init__(app)

    async def dispatch(self, request: Request, call_next):
        request.state.user = None # Ensure user state is reset for each request

        # Check if path is exempt from authentication
        # request.url.path includes the full path, e.g., /api/v1/auth/login
        # We need to compare against the path *after* the gateway's own API prefix (settings.API_V1_STR)

        path_to_check = request.url.path
        if path_to_check.startswith(settings.API_V1_STR): # settings.API_V1_STR is like "/api/v1"
            path_to_check = path_to_check[len(settings.API_V1_STR):] # Get path relative to /api/v1, e.g. /auth/login

        # Handle OPTIONS requests (often used for CORS preflight) - allow without auth
        if request.method == "OPTIONS":
            return await call_next(request)

        is_exempt = False
        for exempt_path_prefix in EXEMPT_PATHS:
            if path_to_check.startswith(exempt_path_prefix):
                # More precise matching might be needed if exempt_path_prefix can be a sub-path of a protected one
                # e.g. /auth/login vs /auth/protected_resource
                # For now, startswith is used.
                is_exempt = True
                logger.debug(f"Path '{request.url.path}' (relative '{path_to_check}') is exempt from auth.", exempt_prefix=exempt_path_prefix)
                break

        if is_exempt:
            return await call_next(request)

        # Authentication logic for non-exempt paths
        auth_header = request.headers.get("Authorization")
        if not auth_header:
            logger.warning("Missing Authorization header.", path=request.url.path)
            return JSONResponse(
                status_code=status.HTTP_401_UNAUTHORIZED,
                content={"detail": "Not authenticated"},
                headers={"WWW-Authenticate": "Bearer"},
            )

        try:
            scheme, token = auth_header.split()
            if scheme.lower() != "bearer":
                logger.warning(f"Invalid authentication scheme: {scheme}.", path=request.url.path)
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid authentication scheme.")
        except ValueError:
            logger.warning("Malformed Authorization header.", path=request.url.path)
            return JSONResponse(
                status_code=status.HTTP_401_UNAUTHORIZED,
                content={"detail": "Malformed Authorization header"},
                headers={"WWW-Authenticate": "Bearer error=\"invalid_request\""},
            )

        jwt_secret = settings.ASSEMBLED_JWT_SECRET
        if not jwt_secret:
            logger.error("JWT_SECRET not configured on API Gateway. Cannot validate tokens.")
            # This is a server configuration error, should not happen in prod.
            return JSONResponse(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                content={"detail": "Authentication system configuration error."},
            )

        try:
            payload = jwt.decode(
                token,
                jwt_secret,
                algorithms=[settings.JWT_ALGORITHM],
                audience=settings.JWT_AUDIENCE, # Optional: validate audience
                issuer=settings.JWT_ISSUER # Optional: validate issuer
            )

            user_id = payload.get("user_id", payload.get("sub"))
            if not user_id:
                logger.warning("Token payload missing 'user_id' or 'sub'.", token_payload=payload)
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload.")

            email = payload.get("email")
            roles_from_payload = payload.get("roles")
            actual_roles = []
            if isinstance(roles_from_payload, str): actual_roles = [roles_from_payload]
            elif isinstance(roles_from_payload, list): actual_roles = [str(r) for r in roles_from_payload if r is not None]

            request.state.user = AuthenticatedUserState(id=str(user_id), email=email, roles=actual_roles)
            logger.debug("User authenticated via JWT.", user_id=user_id, path=request.url.path)

        except jwt.ExpiredSignatureError:
            logger.info("Expired JWT token.", path=request.url.path)
            return JSONResponse(
                status_code=status.HTTP_401_UNAUTHORIZED,
                content={"detail": "Token has expired"},
                headers={"WWW-Authenticate": "Bearer error=\"invalid_token\", error_description=\"The token has expired\""},
            )
        except jwt.InvalidTokenError as e: # Catches various other JWT errors (InvalidSignatureError, etc.)
            logger.warning(f"Invalid JWT token: {str(e)}", path=request.url.path, error_type=type(e).__name__)
            return JSONResponse(
                status_code=status.HTTP_401_UNAUTHORIZED,
                content={"detail": f"Invalid token: {str(e)}"},
                headers={"WWW-Authenticate": f"Bearer error=\"invalid_token\", error_description=\"{str(e)}\""},
            )
        except Exception as e: # Catch-all for unexpected errors during token processing
            logger.error(f"Unexpected error during token validation: {str(e)}", exc_info=True, path=request.url.path)
            return JSONResponse(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                content={"detail": "Error processing authentication token."},
            )

        return await call_next(request)
