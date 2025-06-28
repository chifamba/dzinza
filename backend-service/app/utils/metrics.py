from prometheus_client import Counter, Histogram, CollectorRegistry, generate_latest, CONTENT_TYPE_LATEST
from fastapi import Request, Response as FastAPIResponse
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseCallNext
import time

from app.core.config import settings
from app.utils.logger import logger

registry = CollectorRegistry()

# Standard HTTP Metrics for requests received by the gateway
HTTP_REQUESTS_TOTAL_GATEWAY = Counter(
    "http_requests_total_gateway",
    "Total HTTP requests received by the gateway.",
    ["method", "path", "status_code"], # Path here is the gateway path
    registry=registry
)
HTTP_REQUEST_DURATION_SECONDS_GATEWAY = Histogram(
    "http_request_duration_seconds_gateway",
    "HTTP request duration at the gateway in seconds.",
    ["method", "path"], # Path here is the gateway path
    buckets=(0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0, float("inf")),
    registry=registry
)

# Metrics for requests proxied to downstream services
DOWNSTREAM_REQUESTS_TOTAL = Counter(
    "downstream_requests_total",
    "Total requests proxied to downstream services.",
    ["target_service", "target_path", "method", "response_status_code"],
    registry=registry
)
DOWNSTREAM_REQUEST_DURATION_SECONDS = Histogram(
    "downstream_request_duration_seconds",
    "Duration of requests proxied to downstream services.",
    ["target_service", "target_path", "method"],
    registry=registry
)
# Note: Capturing downstream metrics accurately requires a hook inside the proxy_service.py
# or by instrumenting httpx client with custom logic if OTel metrics are not directly used/exported for this.
# The PrometheusMiddleware below captures gateway request metrics.
# For downstream, you'd typically rely on OTel traces or logs, or custom increments in proxy_service.py.
# For simplicity, these downstream Prometheus metrics are defined but not automatically populated by PrometheusMiddleware.
# They would need manual incrementing in `proxy_service.py`.

class PrometheusMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: RequestResponseCallNext) -> FastAPIResponse:
        method = request.method
        path = request.url.path # Path received by gateway
        if request.scope.get("route"):
            # Use FastAPI route template for better cardinality if available
            # For gateway with catch-all routes, this might be less specific.
            path_template = request.scope["route"].path_format
            # Example: /api/auth{path_suffix:path} -> use this as 'path' label
            # This requires careful naming of path parameter in router.
            # If path_params has 'path_suffix', use it to make path more generic.
            # For now, using `path_template` which might be like `/api/auth/{path:path}`
            path = path_template

        start_time = time.time()
        status_code = 500 # Default for unhandled exceptions

        try:
            response = await call_next(request)
            status_code = response.status_code
        except Exception as e:
            # If an error occurs and is handled by FastAPI's exception handlers,
            # status_code here might not reflect the final response code.
            # This middleware runs early. The final status code is what we want.
            # This is a common challenge with middleware metrics for status codes.
            # A workaround is to inspect response in an 'after_response' hook if framework supports,
            # or rely on OpenTelemetry which often handles this better with instrumentors.
            # For now, this will capture status if no exception or if exception is converted to response by `call_next`.
            raise e
        finally:
            # This block executes. If an exception was re-raised, status_code might be the default 500
            # or whatever it was before the exception.
            # If FastAPI's error handlers create a new response, this middleware won't see its status_code.
            # This is a limitation of simple BaseHTTPMiddleware for accurate status_code on error.
            duration = time.time() - start_time
            HTTP_REQUEST_DURATION_SECONDS_GATEWAY.labels(method=method, path=path).observe(duration)
            HTTP_REQUESTS_TOTAL_GATEWAY.labels(method=method, path=path, status_code=str(status_code)).inc()

        return response

def get_metrics_handler():
    async def metrics_endpoint(request: Request) -> FastAPIResponse:
        try:
            return FastAPIResponse(generate_latest(registry), media_type=CONTENT_TYPE_LATEST)
        except Exception as e:
            logger.error(f"Error generating Prometheus metrics for API Gateway: {e}", exc_info=True)
            return FastAPIResponse("Error generating metrics", status_code=500)
    return metrics_endpoint

# To manually increment downstream metrics from proxy_service.py:
# from app.utils.metrics import DOWNSTREAM_REQUESTS_TOTAL, DOWNSTREAM_REQUEST_DURATION_SECONDS
#
# In proxy_service.py, around `http_client.send()`:
# target_service_label = "auth_service" # Determine this based on routing logic
# target_path_label = downstream_req.url.path # Path sent to downstream
# downstream_start_time = time.time()
# try:
#     downstream_resp = await http_client.send(downstream_req, stream=True)
#     downstream_duration = time.time() - downstream_start_time
#     DOWNSTREAM_REQUEST_DURATION_SECONDS.labels(target_service=target_service_label, target_path=target_path_label, method=request.method).observe(downstream_duration)
#     DOWNSTREAM_REQUESTS_TOTAL.labels(target_service=target_service_label, target_path=target_path_label, method=request.method, response_status_code=str(downstream_resp.status_code)).inc()
# except Exception as e:
#     # Handle error, potentially increment error counter for downstream service
#     downstream_duration = time.time() - downstream_start_time # Duration until error
#     DOWNSTREAM_REQUEST_DURATION_SECONDS.labels(target_service=target_service_label, target_path=target_path_label, method=request.method).observe(downstream_duration)
#     # Determine an appropriate error status code to log for the downstream attempt
#     error_status = "error" # Or specific error code if available from httpx exception
#     if isinstance(e, httpx.TimeoutException): error_status = "timeout"
#     elif isinstance(e, httpx.ConnectError): error_status = "connect_error"
#     DOWNSTREAM_REQUESTS_TOTAL.labels(target_service=target_service_label, target_path=target_path_label, method=request.method, response_status_code=error_status).inc()
#     raise # Re-raise the exception for proxy_service to handle and return gateway error response
# This manual instrumentation would provide more accurate downstream metrics.
# For now, these metrics are defined but not auto-populated by this middleware.
