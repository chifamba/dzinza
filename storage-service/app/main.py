"""Main entrypoint for the storage-service FastAPI application."""

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException
from fastapi.exceptions import RequestValidationError

from app.config import settings
from app.database import connect_to_mongo, close_mongo_connection, get_database  # For health check potentially
from app.services.s3_service import startup_s3_client, shutdown_s3_client, S3Client  # For health check
from app.services.cleanup_service import startup_cleanup_service, shutdown_cleanup_service  # Import cleanup service handlers
from app.api import api_router  # Import the main API router

from starlette_prometheus import PrometheusMiddleware, metrics
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
import structlog  # Import structlog

# Configure structlog
structlog.configure(
    processors=[
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,  # Use standard structlog processor
        structlog.dev.ConsoleRenderer() if settings.DEBUG else structlog.processors.JSONRenderer(),
    ],
    logger_factory=structlog.stdlib.LoggerFactory(),
    wrapper_class=structlog.stdlib.BoundLogger,
    cache_logger_on_first_use=True,
)

logger = structlog.get_logger(__name__)  # Use structlog logger

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.PROJECT_VERSION,
    debug=settings.DEBUG,
    openapi_url="/api/v1/openapi.json"
)

# Event Handlers for DB and S3 connections
@app.on_event("startup")
async def startup_event():
    logger.info("Application startup...")
    await connect_to_mongo()
    await startup_s3_client()
    await startup_cleanup_service() # Start the cleanup scheduler
    logger.info("MongoDB, S3Service, and CleanupService initialized.")

@app.on_event("shutdown")
async def shutdown_event():
    logger.info("Application shutdown...")
    await shutdown_cleanup_service() # Shutdown the cleanup scheduler
    await close_mongo_connection()
    await shutdown_s3_client()
    logger.info("CleanupService, MongoDB and S3Service connections closed.")

# Prometheus Middleware
app.add_middleware(PrometheusMiddleware)
app.add_route("/metrics", metrics)

# OpenTelemetry Instrumentation
if settings.ENABLE_TRACING:
    try:
        FastAPIInstrumentor.instrument_app(app, service_name=settings.OTEL_SERVICE_NAME)
        logger.info(f"OpenTelemetry tracing enabled for {settings.OTEL_SERVICE_NAME}.")
        # Further OTLP exporter configuration could be done here if not using auto-instrumentation defaults
        # or environment variable configurations for the exporter.
    except Exception as e:
        logger.error(f"Failed to initialize OpenTelemetry tracing: {e}", exc_info=True)


# CORS Middleware
if settings.ALLOWED_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[str(origin) for origin in settings.ALLOWED_ORIGINS],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

# Include the API router from app.api
app.include_router(api_router, prefix="/api/v1")


# Basic Health Check
@app.get("/health", tags=["System"])
async def health_check():
    db_status = "connected"
    db_details = {}
    try:
        # A lightweight way to check MongoDB connection with Motor
        # Accessing DataStorage.db directly after it's set by connect_to_mongo
        if get_database() is not None:  # Check if db object exists
            await get_database().command('ping')  # Pings the server
        else:
            db_status = "not_initialized"
    except Exception as e:
        db_status = "error"
        db_details = {"error": str(e)}
        logger.error(f"Health check: MongoDB ping failed: {e}")

    s3_status = "connected" if S3Client.is_connected() else "disconnected"
    if not S3Client.is_connected():
        logger.warning("Health check: S3 Client is not connected.")

    if db_status == "connected" and s3_status == "connected":
        return {
            "status": "healthy",
            "service": settings.PROJECT_NAME,
            "mongodb": db_status,
            "s3": s3_status
        }
    return JSONResponse(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        content={
            "status": "unhealthy",
            "service": settings.PROJECT_NAME,
            "mongodb": db_status,
            "s3": s3_status,
            "mongodb_details": db_details if db_status == "error" else "N/A"
        }
    )

# Global Exception Handlers
@app.exception_handler(StarletteHTTPException)
async def custom_http_exception_handler(request: Request, exc: StarletteHTTPException):
    logger.error(f"HTTPException: {exc.status_code} {exc.detail}", extra={"url": str(request.url)})
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    error_details = []
    for error in exc.errors():
        field = " -> ".join(map(str, error["loc"])) if error["loc"] else "body"
        error_details.append({"field": field, "message": error["msg"], "type": error["type"]})
    logger.warning(f"RequestValidationError: {error_details}", extra={"url": str(request.url), "body": exc.body if hasattr(exc, 'body') else 'N/A'})
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": "Validation Error", "errors": error_details},
    )

@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    logger.critical(f"Unhandled Exception: {exc}", exc_info=True, extra={"url": str(request.url)})
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "An unexpected internal server error occurred."},
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=settings.PORT)
