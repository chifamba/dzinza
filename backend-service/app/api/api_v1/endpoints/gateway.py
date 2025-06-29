from fastapi import APIRouter, Request, Depends
from fastapi.responses import StreamingResponse

from app.services.proxy import reverse_proxy
from app.core.config import settings # For rate limit strings
from app.middleware.rate_limiter import limiter # Import the limiter instance

router = APIRouter()

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

    # The reverse_proxy function expects the path relative to the service mapping prefixes.
    # If this gateway router is mounted at root "/", then `path` is directly usable.
    # If this router is mounted at e.g. `/gateway_api_prefix`, then `path` here would be
    # `actual_service_path_segment/...`. `settings.SERVICE_URLS_BY_PREFIX` should map
    # `actual_service_path_segment` to the downstream service.

    # Example: Request to http://localhost:3001/auth/login
    # If this router is mounted at `/` in main.py, then `path` = "auth/login"
    # `get_target_service_url("auth/login")` will be called.

    # Example: Request to http://localhost:3001/api/v1/gateway/auth/login
    # If this router is mounted at `/api/v1/gateway` in main.py, then `path` = "auth/login"
    # `get_target_service_url("auth/login")` will be called.

    # It's important that `path` passed to `reverse_proxy` is what `get_target_service_url` expects
    # (i.e., starting with the prefix key like "auth", "genealogy", etc.).

    return await reverse_proxy(request, path)

# Example: If you had specific gateway-level non-proxied endpoints, they would go above the catch-all.
# @router.get("/gateway-info")
# async def get_gateway_info():
#     return {"message": "This is the API Gateway."}
