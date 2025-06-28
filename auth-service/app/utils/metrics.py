from prometheus_client import Counter, Histogram, CollectorRegistry, generate_latest, CONTENT_TYPE_LATEST
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
import time

from app.core.config import settings
from app.utils.logger import logger

# Create a custom registry (optional, can use default registry)
registry = CollectorRegistry()

# Define standard metrics
HTTP_REQUESTS_TOTAL = Counter(
    "http_requests_total",
    "Total number of HTTP requests processed",
    ["method", "path", "status_code"],
    registry=registry
)

HTTP_REQUEST_DURATION_SECONDS = Histogram(
    "http_request_duration_seconds",
    "Histogram of HTTP request latencies",
    ["method", "path"],
    buckets=(0.005, 0.01, 0.025, 0.05, 0.075, 0.1, 0.25, 0.5, 0.75, 1.0, 2.5, 5.0, 7.5, 10.0, float("inf")),
    registry=registry
)

# Define application-specific metrics (examples)
USER_REGISTRATIONS_TOTAL = Counter(
    "user_registrations_total",
    "Total number of user registrations",
    ["status"], # e.g., "success", "failure_email_exists", "failure_validation"
    registry=registry
)

USER_LOGINS_TOTAL = Counter(
    "user_logins_total",
    "Total number of user login attempts",
    ["status"], # e.g., "success", "failure_credentials", "failure_inactive", "failure_mfa"
    registry=registry
)

# Middleware for collecting standard HTTP metrics
class PrometheusMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        method = request.method
        path = request.url.path # Consider template path for FastAPI for better cardinality

        # Try to get FastAPI route template if available
        if request.scope.get("route"):
            path = request.scope["route"].path_format

        start_time = time.time()

        try:
            response = await call_next(request)
            status_code = response.status_code
        except Exception as e:
            # Handle exceptions to ensure metrics are still recorded for errors
            status_code = 500 # Default to 500 for unhandled exceptions
            # You might want to re-raise the exception or handle it according to your app's error handling
            raise e from None # Re-raise the exception
        finally:
            # This block will execute even if an exception occurs and is re-raised
            # However, if the exception is handled and a response is returned, this will also run.
            # If an exception is raised and not caught by FastAPI error handlers before this,
            # 'response' variable might not be set.
            # A more robust way is to ensure status_code is always set.
            # The above try/except/finally attempts to ensure status_code is set.

            duration = time.time() - start_time
            HTTP_REQUEST_DURATION_SECONDS.labels(method=method, path=path).observe(duration)
            HTTP_REQUESTS_TOTAL.labels(method=method, path=path, status_code=str(status_code)).inc()

            # If the exception was raised and not handled to return a response,
            # the 'response' variable might not be valid here.
            # However, since we re-raise, FastAPI's error handling will take over.
            # If it was handled and a response object was created, we return it.
            # This structure assumes that if call_next raises, we want to record metrics and re-raise.

        return response


def get_metrics_handler():
    """
    Returns a handler function for the /metrics endpoint.
    """
    async def metrics_endpoint(request: Request) -> Response:
        try:
            return Response(generate_latest(registry), media_type=CONTENT_TYPE_LATEST)
        except Exception as e:
            logger.error(f"Error generating Prometheus metrics: {e}", exc_info=True)
            return Response("Error generating metrics", status_code=500)
    return metrics_endpoint

# Example of incrementing a custom counter:
# from app.utils.metrics import USER_REGISTRATIONS_TOTAL
# USER_REGISTRATIONS_TOTAL.labels(status="success").inc()

# Note: OpenTelemetry also provides metrics capabilities.
# For a unified system, you might export OTel metrics to Prometheus.
# This prometheus_client setup is direct and common for Python apps.
# If using OTel for metrics:
# from opentelemetry import metrics
# meter = metrics.get_meter(__name__)
# user_registrations_counter = meter.create_counter(
#     "user_registrations_total_otel",
#     description="Total user registrations (OTel)",
#     unit="1"
# )
# user_registrations_counter.add(1, {"status": "success"})
# And then use an OTel Prometheus exporter.
# For simplicity now, direct prometheus_client is used.
