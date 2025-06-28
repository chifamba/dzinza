from fastapi import FastAPI, Depends, HTTPException, status, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import uuid # For auth dependency type hint

from app.core.config import settings
from app.api.v1 import api_v1_router
from app.db.database import connect_to_mongo_storage, close_mongo_storage_connection, create_storage_indexes, get_storage_database
from app.utils.logger import logger
from app.utils.tracing import init_tracer, instrument_application_storage
from app.utils.metrics import PrometheusMiddleware, get_metrics_handler
from app.middleware.auth_middleware import get_current_active_user_id_dependency # Actual auth dependency
from app.services.cleanup_service import CleanupService # Import CleanupService
from app.services.s3_service import s3_service_instance # To check if functional

# Global variable for CleanupService instance to be managed by lifespan
cleanup_service_instance: Optional[CleanupService] = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    global cleanup_service_instance
    logger.info(f"Starting up {settings.PROJECT_NAME} (Storage Service) in {settings.ENVIRONMENT} mode...")

    await connect_to_mongo_storage()
    await create_storage_indexes()

    init_tracer()
    instrument_application_storage(app)

    # Initialize and start CleanupService scheduler
    # Pass the already connected DB instance if CleanupService needs it directly,
    # or let CleanupService get it via get_storage_database()
    db_instance = get_storage_database()
    cleanup_service_instance = CleanupService(db=db_instance)
    cleanup_service_instance.start()

    logger.info("Storage Service startup complete.")
    yield
    logger.info(f"Shutting down {settings.PROJECT_NAME} (Storage Service)...")
    if cleanup_service_instance:
        cleanup_service_instance.shutdown()
    await close_mongo_storage_connection()
    logger.info("Storage Service shutdown complete.")


app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan
)

if settings.CORS_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[str(origin) for origin in settings.CORS_ORIGINS],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

app.add_middleware(PrometheusMiddleware)

@app.exception_handler(HTTPException)
async def http_exception_handler_storage(request: Request, exc: HTTPException): # Renamed handler
    logger.error(f"HTTPException: {exc.status_code} {exc.detail} for {request.method} {request.url}", exc_info=False if exc.status_code < 500 else True)
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail}, headers=exc.headers)

@app.exception_handler(Exception)
async def generic_exception_handler_storage(request: Request, exc: Exception): # Renamed handler
    logger.error(f"Unhandled Exception: {exc} for {request.method} {request.url}", exc_info=True)
    return JSONResponse(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, content={"detail": "An unexpected internal server error occurred in Storage Service."})

app.include_router(api_v1_router, prefix=settings.API_V1_STR)

metrics_handler = get_metrics_handler()
app.add_route("/metrics", metrics_handler, methods=["GET"])

@app.get("/", tags=["Root"])
async def read_root_storage():
    return {"message": f"Welcome to {settings.PROJECT_NAME}", "environment": settings.ENVIRONMENT}

@app.get("/health", tags=["Health"])
async def health_check_storage():
    db_status = "disconnected"
    s3_status = "not_configured_or_error"
    try:
        db = get_storage_database()
        await db.command('ping')
        db_status = "connected"
    except Exception as e:
        logger.error(f"Health check: Storage MongoDB connection error: {e}")
        db_status = "error"

    if s3_service_instance.is_functional():
        try:
            # A lightweight check, like head_bucket (can be slow or costly depending on provider)
            # Or rely on the is_functional() which checks client initialization.
            # For now, is_functional() is enough to indicate config presence.
            # await s3_service_instance.s3_client.head_bucket(Bucket=settings.S3_BUCKET_NAME) # Example check
            s3_status = "connected_or_configured" # If is_functional is true
        except Exception as e:
            logger.error(f"Health check: S3 service error: {e}")
            s3_status = "error_during_check"

    overall_status = "healthy"
    if db_status != "connected" or (settings.S3_ACCESS_KEY_ID and s3_status != "connected_or_configured"): # If S3 is configured but not ok
        overall_status = "degraded"

    return {
        "status": overall_status,
        "service": settings.OTEL_SERVICE_NAME,
        "timestamp": datetime.utcnow().isoformat(),
        "dependencies": {
            "mongodb": db_status,
            "s3_storage": s3_status,
            "scheduler": "running" if cleanup_service_instance and cleanup_service_instance.scheduler.running else "stopped_or_not_init"
        },
        "version": "1.0.0"
    }

# Routers need to be updated to use the actual auth dependency from app.middleware.auth_middleware
# This will be done next.

from datetime import datetime # for health check timestamp
from typing import Optional # for cleanup_service_instance type hint
