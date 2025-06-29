from fastapi import Request, HTTPException, status
from fastapi.responses import StreamingResponse, Response # Ensure Response is imported
import httpx
import structlog
from typing import Tuple, Optional, Dict, Any

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
    Determines the target downstream service URL and the remaining path for that service.
    Returns a tuple: (base_service_url, path_for_service) or None if no match.
    """
    path_segments = path.strip("/").split("/")
    if not path_segments:
        return None

    # Use the SERVICE_BASE_URLS_BY_PREFIX map from settings
    # Example: path "auth/login" -> first_segment "auth"
    #          path "family-trees/123/persons" -> first_segment "family-trees"

    first_segment = path_segments[0]

    if first_segment in settings.SERVICE_BASE_URLS_BY_PREFIX:
        # This is the scheme://host:port of the downstream service (e.g., "http://auth-service-py:8000")
        service_base_url = settings.SERVICE_BASE_URLS_BY_PREFIX[first_segment]

        # The rest of the path, including the matched first_segment, forms the path for the downstream service's API.
        # All downstream services are expected to host their APIs under /api/v1/
        # So, if original path was "auth/login", downstream path is "/api/v1/auth/login"
        # If original path was "family-trees/ID", downstream path is "/api/v1/family-trees/ID"

        downstream_path = "/api/v1/" + "/".join(path_segments) # e.g., /api/v1/auth/login
                                                          # or /api/v1/family-trees/id/persons

        logger.debug(
            f"Path mapping: original_path='{path}', matched_prefix='{first_segment}', "
            f"target_service_base_url='{service_base_url}', path_on_target_service='{downstream_path}'"
        )
        # Return the service's base URL (scheme://host:port) and the full path for its API
        return service_base_url, downstream_path

    logger.warning(f"No downstream service configured for path prefix: {first_segment} (full path: {path})")
    return None


def _filter_headers(incoming_headers: httpx.Headers, request_host: str) -> Dict[str, str]:
    """Filters headers for forwarding to downstream service."""
    headers_to_forward = {}
    for name, value in incoming_headers.items():
        if name.lower() not in HOP_BY_HOP_HEADERS and name.lower() not in GATEWAY_MANAGED_HEADERS:
            headers_to_forward[name] = value

    # TODO: Add/modify specific headers:
    # - X-Forwarded-For, X-Forwarded-Proto, X-Forwarded-Host
    # - Trace propagation headers (OpenTelemetry)
    # - Authorization header might be re-generated or passed through
    # - If gateway authenticates, it might add a X-User-ID, X-User-Roles header

    # Example: if request.state.user exists (from an auth middleware)
    # if hasattr(request.state, "user") and request.state.user:
    #     headers_to_forward["X-User-Id"] = str(request.state.user.id)
    #     headers_to_forward["X-User-Roles"] = ",".join(request.state.user.roles)

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
    # service_base_url = http://auth-service-py:8000 (from new SERVICE_BASE_URLS_BY_PREFIX)
    # downstream_path = /api/v1/auth/login
    # So, target_url = service_base_url + downstream_path

    service_base_url, downstream_path = target_info
    target_url = service_base_url.rstrip("/") + downstream_path # downstream_path already starts with /

    # Query parameters
    query_params = request.query_params

    # Headers
    # Get original request host for X-Forwarded-Host
    request_host = request.headers.get("host", "")
    headers = _filter_headers(request.headers, request_host=request_host)
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
