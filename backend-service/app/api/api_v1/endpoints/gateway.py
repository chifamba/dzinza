from fastapi import APIRouter, Request, Depends
from fastapi.responses import StreamingResponse
import structlog

from app.services.proxy import reverse_proxy
from app.core.config import settings # For rate limit strings
from app.middleware.rate_limiter import limiter # Import the limiter instance

router = APIRouter()
logger = structlog.get_logger(__name__)

# This catch-all route should be last if you have other specific routes in this router.
# It will match any path not caught by preceding routes.
@router.api_route("/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"])
@limiter.limit(settings.RATE_LIMIT_DEFAULT) # Apply default rate limit
async def gateway_proxy_all(
    request: Request, # FastAPI will inject the request object
    path: str,
    # current_user: Optional[User] = Depends(get_current_user_optional) # Example if gateway handles auth
):
    """
    Main gateway endpoint that proxies all matching requests to downstream services.
    The 'path' variable will capture everything after the router's prefix.
    If this router is mounted at "/", path will be the full request path.
    If mounted at "/api/v1/gateway", and request is "/api/v1/gateway/auth/login",
    then 'path' will be "auth/login".
    """
    # request.state.user = current_user # Make user available to proxy logic if needed for headers
    
    # Log original path for debugging
    original_path = path
    logger.debug(f"Gateway received path: {original_path}, URL: {request.url}")
    
    # We no longer strip v1/ prefix - instead, downstream services should expect it
    # Only handle legacy redirects for any non-v1 prefixed paths that might still be in use
    
    # Check if path is a health check and forward as is
    if path == "health" or path.endswith("/health"):
        return await reverse_proxy(request, path)
    
    # For all other paths, ensure they have the v1 prefix when forwarded to services
    # Don't modify paths that already have v1 prefix
    if not path.startswith("v1/"):
        # Add the v1 prefix to the path before forwarding
        path_with_v1 = f"v1/{path}"
        logger.debug(f"Adding v1 prefix: {original_path} -> {path_with_v1}")
        return await reverse_proxy(request, path_with_v1)
    
    # Path already has v1 prefix, forward as is
    return await reverse_proxy(request, path)

# Example: If you had specific gateway-level non-proxied endpoints, they would go above the catch-all.
# @router.get("/gateway-info")
# async def get_gateway_info():
#     return {"message": "This is the API Gateway."}
