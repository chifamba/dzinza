from fastapi import Request, HTTPException, status
from fastapi.responses import StreamingResponse, Response # Ensure Response is imported
import httpx
import structlog
from typing import Tuple, Optional, Dict

from app.core.config import settings

logger = structlog.get_logger(__name__)

# Headers to remove from incoming request before sending to downstream service
# (hop-by-hop headers, security headers handled by gateway, etc.)
HOP_BY_HOP_HEADERS = [
    "connection", "keep-alive", "proxy-authenticate", "proxy-authorization",
    "te", "trailers", "transfer-encoding", "upgrade", "host" # Host will be set by httpx based on target URL
]
# Additional headers the gateway might want to strip or manage itself
GATEWAY_MANAGED_HEADERS = ["content-length", "content-type"] # Content-Type might be re-evaluated

def get_target_service_url(path: str) -> Optional[Tuple[str, str]]:
    """
    Determines the target downstream service URL and the path segment for that service.
    The path segment does NOT include the /v1/ prefix, as that will be added by reverse_proxy for non-health endpoints.
    Returns a tuple: (service_base_url, path_segment_for_service) or None if no match.
    Example path inputs from gateway: "auth/login", "auth/health", "genealogy/persons", "family-trees/123"
    """
    # Normalize path by removing leading/trailing slashes and split
    # If path is empty or just "/", path_segments might be [""] or empty.
    # Example: "auth/login" -> ["auth", "login"]
    #          "health" -> ["health"] (This case should ideally not happen if gateway always has a prefix like /api)
    #          "" -> [""]
    #          "auth" -> ["auth"]
    if path.startswith('/api/v1/'):
        path = path[len('/api/v1/'):]
    stripped_path = path.strip("/")
    if not stripped_path: # Handles empty path or path that was just "/"
        # This case should ideally be caught before, or means no specific service target.
        # However, if a prefix like "auth" could map to its own root, this logic might need adjustment.
        # For now, returning None as no clear first_segment to map.
        logger.warning(f"Path is empty or root after stripping: '{path}'")
        return None

    path_segments = stripped_path.split("/")
    first_segment = path_segments[0]

    if first_segment not in settings.SERVICE_BASE_URLS_BY_PREFIX:
        logger.warning(f"No downstream service configured for path prefix: '{first_segment}' (from path: '{path}')")
        logger.debug(f"Available prefixes: {list(settings.SERVICE_BASE_URLS_BY_PREFIX.keys())}")
        return None

    service_base_url = settings.SERVICE_BASE_URLS_BY_PREFIX[first_segment]
    downstream_path_for_service: str

    # Determine the path segment for the downstream service.
    # This segment will be appended to "service_base_url/v1/" or "service_base_url/" for health checks.

    # Case 1: Health check for a prefixed service (e.g., "auth/health")
    # path_segments would be ["auth", "health"]. first_segment is "auth".
    # We want downstream_path_for_service = "/health"
    if len(path_segments) > 1 and path_segments[-1] == "health":
        # This covers "auth/health", "genealogy/health" (if "genealogy" is a direct prefix),
        # "family-trees/health" etc.
        downstream_path_for_service = "/health"
    # Case 2: Path starts with "genealogy" prefix (e.g., "genealogy/family-trees/123")
    # downstream_path_for_service should be "/family-trees/123"
    elif first_segment == "genealogy":
        if len(path_segments) > 1: # e.g., "genealogy/persons"
            downstream_path_for_service = "/" + "/".join(path_segments[1:])
        else: # Just "genealogy"
            downstream_path_for_service = "/" # Represents the root of the genealogy path structure
    # Case 3: Default path construction for other prefixes (e.g., "auth/login", "family-trees/123")
    # downstream_path_for_service should be "/auth/login" or "/family-trees/123"
    else:
        # This covers "auth/login", "family-trees/123", "search/persons"
        # path_segments = ["auth", "login"] -> "/auth/login"
        # path_segments = ["family-trees", "123"] -> "/family-trees/123"
        downstream_path_for_service = "/" + "/".join(path_segments)

    logger.debug(
        f"Path mapping: original_path='{path}', matched_prefix='{first_segment}', "
        f"target_service_base_url='{service_base_url}', "
        f"downstream_path_segment_for_service='{downstream_path_for_service}'"
    )
    return service_base_url, downstream_path_for_service


def _filter_headers(request: Request, request_host: str) -> Dict[str, str]:
    """Filters headers for forwarding to downstream service."""
    headers_to_forward = {}
    for name, value in request.headers.items():
        if name.lower() not in HOP_BY_HOP_HEADERS and name.lower() not in GATEWAY_MANAGED_HEADERS:
            headers_to_forward[name] = value

    # TODO: Add/modify specific headers:
    # - X-Forwarded-For, X-Forwarded-Proto, X-Forwarded-Host
    # - Trace propagation headers (OpenTelemetry)
    # - Authorization header might be re-generated or passed through
    # - If gateway authenticates, it might add a X-User-ID, X-User-Roles header
    if hasattr(request.state, "user") and request.state.user:
        user_state = request.state.user
        headers_to_forward["X-User-ID"] = str(user_state.id)
        if hasattr(user_state, "email") and user_state.email: # Add email if available
             headers_to_forward["X-User-Email"] = str(user_state.email)
        if hasattr(user_state, "roles") and user_state.roles: # Add roles if available
            headers_to_forward["X-User-Roles"] = ",".join(user_state.roles)

    if request_host:
        headers_to_forward["X-Forwarded-Host"] = request_host

    return headers_to_forward


async def reverse_proxy(request: Request, path: str):
    """
    Core reverse proxy logic.
    'path' is the full path from the original request that needs to be proxied.
    """
    http_client: httpx.AsyncClient = request.app.state.http_client

    target_info = get_target_service_url(path)
    if not target_info:
        logger.warning(f"Path not routable: {path}")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="The requested resource was not found on this server.")

    # base_target_url, path_on_service = target_info
    # For now, get_target_service_url returns the full URL as first element
    # This needs to be consistent. Let's assume get_target_service_url returns:
    # (downstream_service_api_root_url, path_to_append_to_it)
    # The previous version of get_target_service_url returned:
    # (base_service_api_url, path_on_downstream_service)
    # base_service_api_url = http://auth-service/api/v1 (from old SERVICE_URLS_BY_PREFIX)
    # path_on_downstream_service = /login (if original path was auth/login)
    # This resulted in target_url = http://auth-service/api/v1/login

    # With the NEW get_target_service_url:
    # It returns (service_base_url, downstream_path)
    # service_base_url is like "http://auth-service:8000"
    # service_specific_path_segment is like "/auth/login" or "/health" (already starts with /)
    service_base_url, service_specific_path_segment = target_info

    # The 'path' variable here is the original path received by reverse_proxy from the gateway router,
    # e.g., "auth/login" or "auth/health".
    # This is used to determine if it's a health check path.
    # path.strip("/").endswith("/health") correctly handles cases like "auth/health" and "health".
    is_health_check = path.strip("/").endswith("/health")

    if is_health_check:
        # For health checks, the path to the service is typically service_base_url + /health
        # and get_target_service_url returns "/health" as service_specific_path_segment
        target_url = service_base_url.rstrip("/") + service_specific_path_segment
        logger.debug(f"Constructed health check target URL: {target_url}")
    else:
        # For other endpoints, prepend /v1/
        # Example: service_base_url = "http://auth-service:8000"
        #          service_specific_path_segment = "/auth/login"
        # Target: "http://auth-service:8000/v1/auth/login"
        target_url = service_base_url.rstrip("/") + "/v1" + service_specific_path_segment
        logger.debug(f"Constructed non-health check target URL: {target_url}")

    # Query parameters
    query_params = request.query_params

    # Headers
    # Get original request host for X-Forwarded-Host
    request_host = request.headers.get("host", "")
    headers = _filter_headers(request, request_host=request_host)
    if "x-forwarded-for" not in headers: # Add X-Forwarded-For if not already present
        client_host = request.client.host if request.client else "unknown"
        headers["x-forwarded-for"] = client_host
    if "x-forwarded-proto" not in headers:
        headers["x-forwarded-proto"] = request.url.scheme


    # Request body
    # stream() is an async generator
    # For GET, HEAD, DELETE, OPTIONS, body is typically not sent or empty
    body_bytes = await request.body() # Read full body once. For streaming, use request.stream()

    logger.info(f"Proxying request: {request.method} {target_url}",
                query_params=str(query_params), headers_to_forward=list(headers.keys()))

    try:
        rp_req = http_client.build_request(
            method=request.method,
            url=target_url,
            headers=headers,
            params=query_params, # httpx handles encoding
            content=body_bytes if body_bytes else None
        )
        rp_resp = await http_client.send(rp_req, stream=True)

        # Filter response headers before sending back to client
        response_headers_to_send = {}
        for name, value in rp_resp.headers.items():
            if name.lower() not in HOP_BY_HOP_HEADERS:
                response_headers_to_send[name] = value

        # Return a StreamingResponse
        # The content is an async generator (rp_resp.aiter_bytes())
        return StreamingResponse(
            rp_resp.aiter_bytes(),
            status_code=rp_resp.status_code,
            headers=response_headers_to_send,
            media_type=rp_resp.headers.get("content-type") # Pass through content-type
        )

    except httpx.HTTPStatusError as e: # Errors like 4xx, 5xx from downstream
        logger.error(f"Downstream service returned HTTP error: {e.response.status_code}", url=str(e.request.url), response_text=e.response.text[:200])
        # Return a Response object that mirrors the downstream error
        # Be careful about directly passing downstream content if it's not JSON or could be sensitive
        # For now, creating a simple JSON response based on the error.
        return Response(
            content=e.response.content, # Pass through content
            status_code=e.response.status_code,
            headers=dict(e.response.headers) # Pass through headers (filtered if needed)
        )
    except httpx.RequestError as e: # Network errors, timeouts
        logger.error(f"Error connecting to downstream service: {e.request.url} - {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Service unavailable: Error connecting to {e.request.url}.",
        )
    except Exception as e:
        logger.critical(f"Unexpected error in reverse proxy: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error in API Gateway."
        )
