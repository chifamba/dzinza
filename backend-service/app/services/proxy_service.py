import httpx
from fastapi import Request
from fastapi.responses import StreamingResponse, Response as FastAPIResponse # Renamed to avoid httpx.Response conflict
from typing import Dict, Optional, Union, Any, Tuple, Mapping
import json

from app.core.config import settings
from app.utils.logger import logger

# Global HTTP client (recommended by httpx for performance)
# Configure with timeouts and connection pooling suitable for a gateway
# Limits can be tuned based on expected load and downstream service characteristics
limits = httpx.Limits(max_keepalive_connections=100, max_connections=200, keepalive_expiry=settings.SERVICE_REQUEST_TIMEOUT)
timeout = httpx.Timeout(settings.SERVICE_REQUEST_TIMEOUT, connect=5.0) # connect timeout, read timeout
http_client = httpx.AsyncClient(limits=limits, timeout=timeout, follow_redirects=False) # Do not follow redirects, let client handle


async def forward_request(
    request: Request,
    target_base_url: str,
    target_path: Optional[str] = None, # If different from original path
    strip_prefix: Optional[str] = None # Prefix to strip from original request path
) -> Union[StreamingResponse, FastAPIResponse]:
    """
    Forwards an incoming FastAPI request to a target downstream service.
    """
    original_path = request.url.path
    if strip_prefix and original_path.startswith(strip_prefix):
        downstream_path = original_path[len(strip_prefix):]
    else:
        downstream_path = original_path

    if target_path: # Override path if explicitly provided
        downstream_path = target_path

    # Ensure downstream_path starts with a slash if it's not empty
    if downstream_path and not downstream_path.startswith('/'):
        downstream_path = '/' + downstream_path

    # Construct target URL
    # Example: target_base_url = "http://downstream-service:8000"
    #          downstream_path = "/actual/endpoint"
    #          target_url      = "http://downstream-service:8000/actual/endpoint"
    target_url = f"{target_base_url.rstrip('/')}{downstream_path}"

    # Include query parameters
    if request.url.query:
        target_url += f"?{request.url.query}"

    # Prepare headers
    # Filter out host header as it might cause issues with downstream services if not matching target.
    # httpx will set the correct Host header for the target_url.
    # Also filter out any gateway-specific headers not meant for downstream.
    excluded_headers = {"host", "cookie", "connection", "user-agent"} # Example, customize as needed
    # User-Agent might be good to pass or set a gateway-specific one. For now, let's pass it.
    # Cookies are tricky: pass them if services expect them and it's secure, otherwise strip.
    # For now, let's pass most headers.

    headers_to_forward: Dict[str, str] = {}
    for name, value in request.headers.items():
        if name.lower() not in excluded_headers: # Filter out host, connection etc.
            headers_to_forward[name] = value

    # Add or modify headers if needed, e.g., X-Forwarded-For
    # client_host = request.client.host if request.client else "unknown"
    # headers_to_forward["X-Forwarded-For"] = client_host
    # headers_to_forward["X-Forwarded-Proto"] = request.url.scheme

    # Read request body (if any)
    # request.stream() is an async generator. We need to consume it.
    # For GET, HEAD, OPTIONS, DELETE, body is typically not sent or ignored.
    # For POST, PUT, PATCH, body is expected.
    body_bytes: Optional[bytes] = None
    if request.method not in ("GET", "HEAD", "OPTIONS", "DELETE"):
        try:
            body_bytes = await request.body()
        except Exception as e:
            logger.error(f"Error reading request body for {request.method} {original_path}: {e}")
            # Potentially return 400 if body is expected but unreadable
            # For now, will proceed with body_bytes = None if error

    logger.debug(f"Forwarding request: {request.method} {target_url}, headers: {headers_to_forward.keys()}")
    # if body_bytes: logger.debug(f"Forwarding body (first 100 bytes): {body_bytes[:100]}")

    try:
        # Build the request to the downstream service
        downstream_req = http_client.build_request(
            method=request.method,
            url=target_url,
            headers=headers_to_forward,
            content=body_bytes # httpx handles None content correctly
        )

        # Send the request
        downstream_resp = await http_client.send(downstream_req, stream=True) # stream=True for streaming response

        # Relay the response back
        # Filter out certain headers from downstream response if needed (e.g., 'transfer-encoding', 'connection')
        # 'content-encoding' (like gzip) should usually be handled by httpx transparently if client supports it.
        # If downstream sends chunked, StreamingResponse handles it.
        response_headers_to_forward: Dict[str, str] = {}
        excluded_response_headers = {"transfer-encoding", "connection", "content-length", "content-encoding"} # content-length/encoding handled by StreamingResponse/FastAPI

        for name, value in downstream_resp.headers.items():
            if name.lower() not in excluded_response_headers:
                response_headers_to_forward[name] = value

        # If downstream_resp.num_bytes_downloaded is available and not chunked, can set Content-Length
        # But StreamingResponse generally handles this.
        # content_length = downstream_resp.headers.get("content-length")
        # if content_length:
        #     response_headers_to_forward["Content-Length"] = content_length

        return StreamingResponse(
            downstream_resp.aiter_bytes(), # Async generator for response body
            status_code=downstream_resp.status_code,
            headers=response_headers_to_forward,
            media_type=downstream_resp.headers.get("content-type") # Pass content-type for FastAPI to use
        )

    except httpx.TimeoutException as e:
        logger.error(f"Timeout forwarding request to {target_url}: {e}")
        return FastAPIResponse(content=json.dumps({"error": "Service timeout"}), status_code=status.HTTP_504_GATEWAY_TIMEOUT, media_type="application/json")
    except httpx.ConnectError as e:
        logger.error(f"Connection error forwarding request to {target_url}: {e}")
        return FastAPIResponse(content=json.dumps({"error": "Service connection error"}), status_code=status.HTTP_503_SERVICE_UNAVAILABLE, media_type="application/json")
    except httpx.RequestError as e: # Catch other httpx request errors
        logger.error(f"Request error forwarding request to {target_url}: {e}")
        return FastAPIResponse(content=json.dumps({"error": "Error communicating with service"}), status_code=status.HTTP_502_BAD_GATEWAY, media_type="application/json")
    except Exception as e:
        logger.error(f"Unexpected error in proxy service for {target_url}: {e}", exc_info=True)
        return FastAPIResponse(content=json.dumps({"error": "Gateway internal error"}), status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, media_type="application/json")

async def close_http_client():
    """Closes the global httpx client. Call during application shutdown."""
    await http_client.aclose()
    logger.info("Global HTTPX client closed.")
