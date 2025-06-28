from prometheus_client import Counter, Histogram, CollectorRegistry, generate_latest, CONTENT_TYPE_LATEST
from fastapi import Request, Response as FastAPIResponse
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
    # Buckets appropriate for search queries (can be fast, but also complex ones might take longer)
    buckets=(0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, float("inf")),
    registry=registry
)

# Application-specific metrics for search service
SEARCH_QUERIES_TOTAL = Counter(
    "search_queries_total",
    "Total number of search queries performed.",
    ["target_types", "has_results"], # e.g., target_types="person,tree", has_results="true"
    registry=registry
)
SEARCH_QUERY_PROCESSING_TIME_SECONDS = Histogram(
    "search_query_processing_time_seconds",
    "Time taken for processing search queries (Elasticsearch interaction).",
    ["target_types"],
    registry=registry
)
SUGGESTIONS_REQUESTS_TOTAL = Counter(
    "suggestions_requests_total",
    "Total number of suggestion requests.",
    ["target_type"],
    registry=registry
)
INDEXING_DOCUMENTS_TOTAL = Counter(
    "indexing_documents_total",
    "Total documents processed for indexing.",
    ["index_name", "status"], # status: "success", "error"
    registry=registry
)
INDEXING_BATCH_PROCESSING_TIME_SECONDS = Histogram(
    "indexing_batch_processing_time_seconds",
    "Time taken to process a batch of documents for indexing.",
    ["index_name"],
    registry=registry
)


class PrometheusMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: RequestResponseCallNext) -> FastAPIResponse:
        method = request.method
        path = request.url.path
        if request.scope.get("route"):
            path = request.scope["route"].path_format

        start_time = time.time()
        status_code = 500

        try:
            response = await call_next(request)
            status_code = response.status_code
        except Exception as e:
            raise e
        finally:
            duration = time.time() - start_time
            HTTP_REQUEST_DURATION_SECONDS.labels(method=method, path=path).observe(duration)
            HTTP_REQUESTS_TOTAL.labels(method=method, path=path, status_code=str(status_code)).inc()

        return response

def get_metrics_handler():
    async def metrics_endpoint(request: Request) -> FastAPIResponse:
        try:
            return FastAPIResponse(generate_latest(registry), media_type=CONTENT_TYPE_LATEST)
        except Exception as e:
            logger.error(f"Error generating Prometheus metrics for search-service: {e}", exc_info=True)
            return FastAPIResponse("Error generating metrics", status_code=500)
    return metrics_endpoint

# Example usage:
# from app.utils.metrics import SEARCH_QUERIES_TOTAL
# SEARCH_QUERIES_TOTAL.labels(target_types="person", has_results="true").inc()

# with SEARCH_QUERY_PROCESSING_TIME_SECONDS.labels(target_types="person").time():
#     # perform ES search for person
#     pass
