from fastapi import FastAPI, Depends, HTTPException, status, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import uuid # For auth dependency
from elasticsearch import AsyncElasticsearch # For type hint
from datetime import datetime # for health check timestamp
from typing import Optional # for lifespan type hint (scheduler)

from app.core.config import settings
from app.api.v1 import api_v1_router
from app.elasticsearch.client import connect_to_elasticsearch, close_elasticsearch_connection, get_es_client_dependency
from app.elasticsearch.indices import setup_elasticsearch_indices
# from app.db.database import connect_to_mongo_search, close_mongo_search_connection # If using MongoDB
from app.utils.logger import logger
from app.utils.tracing import init_tracer, instrument_application_search
from app.utils.metrics import PrometheusMiddleware, get_metrics_handler
from app.middleware.auth_middleware import get_current_active_user_id_dependency, get_current_admin_user_id_dependency # Actual auth dependencies

# Optional: If search service uses its own MongoDB instance for analytics/metadata
# from app.db.database import db_context as mongo_search_db_context (rename to avoid confusion)

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(f"Starting up {settings.PROJECT_NAME} (Search Service) in {settings.ENVIRONMENT} mode...")

    # Connect to Elasticsearch
    await connect_to_elasticsearch()
    es_client_instance = await get_es_client_dependency() # Get client after connection
    # Setup Elasticsearch indices (create if not exist)
    await setup_elasticsearch_indices(es_client_instance)

    # Connect to MongoDB if search-service uses it directly
    # if settings.MONGODB_URI:
    #     await connect_to_mongo_search()
    #     # await create_search_service_mongo_indexes() # If any

    init_tracer()
    instrument_application_search(app) # Pass app instance

    # TODO: Initialize any scheduled tasks for indexing if managed by this service (e.g. APScheduler)
    # if settings.INDEXING_SCHEDULE_CRON:
    #     app.state.scheduler = AsyncIOScheduler(timezone="UTC")
    #     app.state.scheduler.add_job(trigger_full_reindex_job_function, CronTrigger.from_crontab(settings.INDEXING_SCHEDULE_CRON))
    #     app.state.scheduler.start()
    #     logger.info("Scheduled indexing job started.")

    logger.info("Search Service startup complete.")
    yield
    logger.info(f"Shutting down {settings.PROJECT_NAME} (Search Service)...")
    # if hasattr(app.state, 'scheduler') and app.state.scheduler.running:
    #     app.state.scheduler.shutdown(wait=False)
    # if settings.MONGODB_URI and mongo_search_db_context.client: # Check if MongoDB was used
    #     await close_mongo_search_connection()
    await close_elasticsearch_connection()
    logger.info("Search Service shutdown complete.")


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
async def http_exception_handler_search(request: Request, exc: HTTPException): # Renamed
    logger.error(f"HTTPException: {exc.status_code} {exc.detail} for {request.method} {request.url}", exc_info=False if exc.status_code < 500 else True)
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail}, headers=exc.headers)

@app.exception_handler(Exception)
async def generic_exception_handler_search(request: Request, exc: Exception): # Renamed
    logger.error(f"Unhandled Exception: {exc} for {request.method} {request.url}", exc_info=True)
    return JSONResponse(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, content={"detail": "An unexpected internal server error occurred in Search Service."})

app.include_router(api_v1_router, prefix=settings.API_V1_STR)

metrics_handler = get_metrics_handler()
app.add_route("/metrics", metrics_handler, methods=["GET"])

@app.get("/", tags=["Root"])
async def read_root_search():
    return {"message": f"Welcome to {settings.PROJECT_NAME}", "environment": settings.ENVIRONMENT}

@app.get("/health", tags=["Health"])
async def health_check_search(es_client: AsyncElasticsearch = Depends(get_es_client_dependency)):
    es_status = "disconnected"
    # mongo_status = "not_used" # If MongoDB is optional for this service

    try:
        if await es_client.ping():
            es_status = "connected"
        else:
            es_status = "ping_failed"
    except Exception as e:
        logger.error(f"Health check: Elasticsearch connection error: {e}")
        es_status = "error"

    # if settings.MONGODB_URI:
    #     try:
    #         mongo_db = await get_mongo_search_dependency() # Assuming this dep exists if Mongo used
    #         await mongo_db.command('ping')
    #         mongo_status = "connected"
    #     except Exception as e:
    #         logger.error(f"Health check: Search MongoDB connection error: {e}")
    #         mongo_status = "error"

    overall_status = "healthy" if es_status == "connected" else "degraded"
    # if settings.MONGODB_URI and mongo_status != "connected": overall_status = "degraded"

    return {
        "status": overall_status,
        "service": settings.OTEL_SERVICE_NAME,
        "timestamp": datetime.utcnow().isoformat(),
        "dependencies": {
            "elasticsearch": es_status,
            # "mongodb_search_meta": mongo_status, # If used
        },
        "version": "1.0.0"
    }

# Update routers to use actual auth dependencies
# This has been done by importing directly in the router files.
