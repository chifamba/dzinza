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
    
    # The 'path' variable (e.g., "auth/login", "auth/health", or even "health" if mapped directly)
    # is passed directly to reverse_proxy.
    # The reverse_proxy and get_target_service_url functions will handle
    # constructing the correct downstream URL, including /v1/ prefixing for non-health check
    # endpoints and identifying the correct service.
    logger.debug(f"Gateway passing path to reverse_proxy: '{path}', Original URL: {request.url}")
    return await reverse_proxy(request, path)

# Example: If you had specific gateway-level non-proxied endpoints, they would go above the catch-all.
# @router.get("/gateway-info")
# async def get_gateway_info():
#     return {"message": "This is the API Gateway."}
