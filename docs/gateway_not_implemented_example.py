from fastapi import APIRouter, Request, Depends, HTTPException, status
from fastapi.responses import JSONResponse
import structlog

from app.services.proxy import reverse_proxy, get_target_service_url
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
    Main gateway endpoint that returns information about unimplemented or misconfigured routes.
    Instead of silently failing with a 404, this provides detailed information about the request.
    """
    # Log original path for debugging
    original_path = path
    logger.debug(f"Gateway received path: {original_path}, URL: {request.url}")
    
    # With the new simplified approach, we only need to prepend '/v1' to the path
    # No need to check for and strip duplicate prefixes
    service_path = path  # This is the path after removing /api prefix (done by router)
    
    # Try to determine target service
    target_service_info = get_target_service_url(service_path)
    target_service = None
    downstream_path = None
    
    if target_service_info:
        target_service, downstream_path = target_service_info
        # Prepend /v1 to all paths except health checks
        if downstream_path == "/health":
            pass  # Keep health checks as is
        else:
            downstream_path = f"/v1{downstream_path}"
    
    # Instead of proxying, return detailed info about the request
    response_data = {
        "status": "not_implemented",
        "message": "This endpoint is not yet implemented or is misconfigured",
        "request_details": {
            "original_path": original_path,
            "service_path": service_path,
            "http_method": request.method,
            "target_service": target_service,
            "downstream_path": downstream_path,
        },
        "available_services": {
            k: v for k, v in settings.SERVICE_BASE_URLS_BY_PREFIX.items()
        },
        "troubleshooting_tips": [
            "Check that the path prefix matches one of the available services",
            "Ensure the service implementation exists and is running",
            "Verify the correct HTTP method is being used",
            "Check for any required headers or authentication"
        ]
    }
    
    # Return a structured error response
    return JSONResponse(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        content=response_data
    )

# Example: If you had specific gateway-level non-proxied endpoints, they would go above the catch-all.
# @router.get("/gateway-info")
# async def get_gateway_info():
#     return {"message": "This is the API Gateway."}
