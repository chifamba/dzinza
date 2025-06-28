from fastapi import FastAPI, Depends, HTTPException, status, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from motor.motor_asyncio import AsyncIOMotorClient # For type hint in lifespan
import uuid # For user_id in auth dependency
from datetime import datetime # for health check timestamp

from app.core.config import settings
from app.api.v1 import api_v1_router
from app.db.database import connect_to_mongo, close_mongo_connection, create_indexes, get_database
from app.utils.logger import logger
from app.utils.tracing import init_tracer, instrument_application
from app.utils.metrics import PrometheusMiddleware, get_metrics_handler
from app.middleware.auth_middleware import get_current_active_user_id_dependency # Actual auth dependency

# Import Celery app instance for potential instrumentation or access
# from app.tasks.celery_app import celery_app


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(f"Starting up {settings.PROJECT_NAME} (Genealogy Service) in {settings.ENVIRONMENT} mode...")

    # Connect to MongoDB
    await connect_to_mongo()
    # Create MongoDB indexes
    await create_indexes() # This should be idempotent

    # Initialize OpenTelemetry Tracer
    init_tracer() # Initializes based on settings.ENABLE_TRACING
    # Instrument FastAPI app and other libraries (Motor, HTTPX, Celery)
    instrument_application(app)

    # TODO: Initialize Celery if needed by the app directly (e.g. for sending tasks)
    # Usually, Celery workers run separately. If app sends tasks, celery_app instance is used.
    # CeleryInstrumentor for producers (app sending tasks) is already in instrument_application.

    logger.info("Genealogy Service startup complete.")
    yield
    # Clean up resources on shutdown
    logger.info(f"Shutting down {settings.PROJECT_NAME} (Genealogy Service)...")
    await close_mongo_connection()
    logger.info("Genealogy Service shutdown complete.")


app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json", # Adjust if service is directly exposed or path changes
    lifespan=lifespan
)

# Middleware
# CORS (might be handled by gateway, but good to have for direct service dev/test)
if settings.CORS_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[str(origin) for origin in settings.CORS_ORIGINS], # Convert AnyHttpUrl to str
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

# Prometheus Metrics Middleware
app.add_middleware(PrometheusMiddleware)

# Custom Error Handler (Example)
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    logger.error(f"HTTPException: {exc.status_code} {exc.detail} for {request.method} {request.url}", exc_info=False if exc.status_code < 500 else True)
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
        headers=exc.headers,
    )

@app.exception_handler(Exception) # Catch-all for unhandled exceptions
async def generic_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled Exception: {exc} for {request.method} {request.url}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "An unexpected internal server error occurred in Genealogy Service."},
    )

# Routers
# The original service mounted some routes at /api/* and notifications at /notifications
# For now, all are under /api/v1. Gateway will handle mapping if needed.
app.include_router(api_v1_router, prefix=settings.API_V1_STR)

# Metrics endpoint
metrics_handler = get_metrics_handler()
app.add_route("/metrics", metrics_handler, methods=["GET"])


@app.get("/", tags=["Root"])
async def read_root_genealogy():
    return {
        "message": f"Welcome to {settings.PROJECT_NAME}",
        "environment": settings.ENVIRONMENT,
        "docs_url": "/docs", # FastAPI default if openapi_url is set
    }

@app.get("/health", tags=["Health"])
async def health_check_genealogy():
    # Check MongoDB connection status
    db_status = "disconnected"
    try:
        db = get_database() # This will raise if not connected
        await db.command('ping') # Verify connection
        db_status = "connected"
    except Exception as e:
        logger.error(f"Health check: MongoDB connection error: {e}")
        db_status = "error"
        # Optionally, return 503 if DB is down
        # raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Database connection error")

    return {
        "status": "healthy" if db_status == "connected" else "degraded",
        "service": settings.OTEL_SERVICE_NAME,
        "timestamp": datetime.utcnow().isoformat(),
        "dependencies": {
            "mongodb": db_status,
            # TODO: Add Celery/Redis health check if critical for this service's health
        },
        "version": "1.0.0" # Replace with actual version
    }

# Update routers to use the actual auth dependency from app.middleware.auth_middleware
# This step is crucial. The placeholder dependencies in the routers need to be replaced.
# I will do this by modifying the router files next.

# Example of how to trigger a Celery task from an endpoint (if needed)
# from app.tasks.duplicate_detection_tasks import detect_potential_duplicates_for_person_task
# @app.post("/trigger-dup-check/{person_id}/{tree_id}")
# async def trigger_dup_check(person_id: str, tree_id: str):
#     detect_potential_duplicates_for_person_task.delay(person_id, tree_id)
#     return {"message": "Duplicate detection task triggered."}
