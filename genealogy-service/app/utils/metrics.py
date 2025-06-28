from prometheus_client import Counter, Histogram, CollectorRegistry, generate_latest, CONTENT_TYPE_LATEST
from fastapi import Request, Response as FastAPIResponse # Renamed to avoid conflict with prometheus_client.Response
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseCallNext
import time

from app.core.config import settings
from app.utils.logger import logger

registry = CollectorRegistry()

# Standard HTTP Metrics
HTTP_REQUESTS_TOTAL = Counter(
    "http_requests_total",
    "Total HTTP requests.",
    ["method", "path", "status_code"],
    registry=registry
)
HTTP_REQUEST_DURATION_SECONDS = Histogram(
    "http_request_duration_seconds",
    "HTTP request duration in seconds.",
    ["method", "path"],
    buckets=(0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0, float("inf")),
    registry=registry
)

# Application-specific metrics (examples for genealogy service)
FAMILY_TREES_CREATED_TOTAL = Counter(
    "family_trees_created_total",
    "Total number of family trees created.",
    registry=registry
)
PERSONS_ADDED_TOTAL = Counter(
    "persons_added_total",
    "Total number of persons added to trees.",
    registry=registry
)
RELATIONSHIPS_CREATED_TOTAL = Counter(
    "relationships_created_total",
    "Total number of relationships created.",
    registry=registry
)
DUPLICATE_DETECTION_TASKS_TRIGGERED_TOTAL = Counter(
    "duplicate_detection_tasks_triggered_total",
    "Total duplicate detection tasks triggered.",
    ["trigger_type"], # e.g., "on_person_create", "periodic_scan"
    registry=registry
)
MERGE_SUGGESTIONS_CREATED_TOTAL = Counter(
    "merge_suggestions_created_total",
    "Total merge suggestions created.",
    ["suggester_type"], # "system", "user"
    registry=registry
)
MERGE_SUGGESTIONS_RESOLVED_TOTAL = Counter(
    "merge_suggestions_resolved_total",
    "Total merge suggestions resolved.",
    ["status"], # "accepted", "rejected", "cancelled"
    registry=registry
)


class PrometheusMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: RequestResponseCallNext) -> FastAPIResponse:
        method = request.method
        path = request.url.path
        if request.scope.get("route"): # Get path template if available
            path = request.scope["route"].path_format

        start_time = time.time()
        status_code = 500 # Default for unhandled exceptions

        try:
            response = await call_next(request)
            status_code = response.status_code
        except Exception as e:
            # Let FastAPI's exception handlers deal with the response itself
            raise e # Re-raise
        finally:
            # This will run even if an exception is raised and caught by FastAPI's handlers,
            # as long as the middleware itself doesn't crash.
            # status_code might not be updated if an unhandled exception bypasses response creation.
            # However, FastAPI usually converts unhandled exceptions to 500 error responses.
            # If response object is available (no exception or handled exception):
            # status_code = response.status_code (already done if call_next succeeded)
            # If an exception was re-raised, status_code remains the default 500 or what was set before error.
            # This part is tricky. A more robust way is to hook into FastAPI's actual response sending.
            # For now, this captures most cases.

            duration = time.time() - start_time
            HTTP_REQUEST_DURATION_SECONDS.labels(method=method, path=path).observe(duration)
            HTTP_REQUESTS_TOTAL.labels(method=method, path=path, status_code=str(status_code)).inc()

        return response

def get_metrics_handler():
    async def metrics_endpoint(request: Request) -> FastAPIResponse:
        try:
            return FastAPIResponse(generate_latest(registry), media_type=CONTENT_TYPE_LATEST)
        except Exception as e:
            logger.error(f"Error generating Prometheus metrics for genealogy-service: {e}", exc_info=True)
            return FastAPIResponse("Error generating metrics", status_code=500)
    return metrics_endpoint

# Example usage:
# from app.utils.metrics import PERSONS_ADDED_TOTAL
# PERSONS_ADDED_TOTAL.inc()

# from app.utils.metrics import DUPLICATE_DETECTION_TASKS_TRIGGERED_TOTAL
# DUPLICATE_DETECTION_TASKS_TRIGGERED_TOTAL.labels(trigger_type="on_person_create").inc()
