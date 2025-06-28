from prometheus_client import Counter, Histogram, CollectorRegistry, generate_latest, CONTENT_TYPE_LATEST, Gauge
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
    buckets=(0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0, 30.0, 60.0, float("inf")), # Added longer buckets for file ops
    registry=registry
)

# Application-specific metrics for storage service
FILES_UPLOADED_TOTAL = Counter(
    "files_uploaded_total",
    "Total number of files successfully uploaded.",
    ["file_type"], # e.g., "image", "document"
    registry=registry
)
FILES_DOWNLOADED_TOTAL = Counter(
    "files_downloaded_total",
    "Total number of files successfully downloaded.",
    ["file_type"],
    registry=registry
)
FILE_UPLOAD_ERRORS_TOTAL = Counter(
    "file_upload_errors_total",
    "Total errors during file upload attempts.",
    ["reason"], # e.g., "s3_error", "validation_error", "processing_error"
    registry=registry
)
BYTES_UPLOADED_TOTAL = Counter(
    "bytes_uploaded_total",
    "Total bytes successfully uploaded.",
    ["file_type"],
    registry=registry
)
BYTES_DOWNLOADED_TOTAL = Counter(
    "bytes_downloaded_total",
    "Total bytes successfully downloaded.",
    ["file_type"],
    registry=registry
)
IMAGE_PROCESSING_TIME_SECONDS = Histogram(
    "image_processing_time_seconds",
    "Time taken for image processing tasks (e.g., thumbnailing).",
    ["operation"], # "thumbnail", "metadata_extraction"
    registry=registry
)
THUMBNAILS_GENERATED_TOTAL = Counter(
    "thumbnails_generated_total",
    "Total image thumbnails generated.",
    registry=registry
)
PRESIGNED_URLS_GENERATED_TOTAL = Counter(
    "presigned_urls_generated_total",
    "Total presigned URLs generated.",
    ["url_type"], # "upload", "download"
    registry=registry
)
TEMP_FILES_CLEANED_TOTAL = Counter(
    "temp_files_cleaned_total",
    "Total temporary files cleaned up by the cleanup service.",
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
            logger.error(f"Error generating Prometheus metrics for storage-service: {e}", exc_info=True)
            return FastAPIResponse("Error generating metrics", status_code=500)
    return metrics_endpoint

# Example usage:
# from app.utils.metrics import FILES_UPLOADED_TOTAL, BYTES_UPLOADED_TOTAL
# FILES_UPLOADED_TOTAL.labels(file_type="image").inc()
# BYTES_UPLOADED_TOTAL.labels(file_type="image").inc(file_size_bytes)

# with IMAGE_PROCESSING_TIME_SECONDS.labels(operation="thumbnail").time():
#     # do thumbnailing work
#     pass
