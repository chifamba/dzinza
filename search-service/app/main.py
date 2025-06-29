from fastapi import FastAPI, Request, status as http_status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException
from fastapi.exceptions import RequestValidationError
import structlog

from app.core.config import settings
from app.services.elasticsearch_client import init_es_client, close_es_client, ElasticsearchClientSingleton
from app.db.analytics_db import connect_to_mongo_analytics, close_mongo_analytics_connection, AnalyticsDataStorage # For analytics DB

# Configure structlog
structlog.configure(
    processors=[
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.dev.ConsoleRenderer() if settings.DEBUG else structlog.processors.JSONRenderer(),
    ],
    logger_factory=structlog.stdlib.LoggerFactory(),
    wrapper_class=structlog.stdlib.BoundLogger,
    cache_logger_on_first_use=True,
)
logger = structlog.get_logger(__name__)

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.PROJECT_VERSION,
    debug=settings.DEBUG,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

@app.on_event("startup")
async def startup_event():
    logger.info(f"{settings.PROJECT_NAME} startup...")
    try:
        await init_es_client() # Initialize Elasticsearch client
        if settings.MONGODB_ANALYTICS_ENABLED:
            await connect_to_mongo_analytics()
            logger.info("Analytics MongoDB connection established.")
        logger.info("Service dependencies initialized.")
    except Exception as e:
        logger.critical(f"Failed to initialize service during startup: {e}", exc_info=True)
        # Optionally re-raise to prevent app from starting if critical dependencies failed
        # raise

@app.on_event("shutdown")
async def shutdown_event():
    logger.info(f"{settings.PROJECT_NAME} shutdown...")
    await close_es_client()
    if settings.MONGODB_ANALYTICS_ENABLED:
        await close_mongo_analytics_connection()
    logger.info("Service dependencies closed.")

# TODO: Add Prometheus and OpenTelemetry middleware

# CORS Middleware
if settings.ALLOWED_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[str(origin) for origin in settings.ALLOWED_ORIGINS],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

# Include the API router
from app.api.api_v1.api import api_router as v1_api_router
app.include_router(v1_api_router, prefix=settings.API_V1_STR)


@app.get("/health", tags=["System"]) # This health check is outside /api/v1 now
async def health_check():
    logger.debug("Health check accessed")
    es_status = "unknown"
    es_details = {}
    analytics_db_status = "not_applicable" # Default if not enabled
    analytics_db_details = {}

    # Check Elasticsearch
    try:
        es_client = ElasticsearchClientSingleton.get_client()
        if await es_client.ping():
            es_status = "connected"
        else:
            es_status = "disconnected"
            es_details = {"error": "Elasticsearch ping failed"}
            logger.warning("Elasticsearch ping failed in health check.")
    except RuntimeError as e:
        es_status = "not_initialized"
        es_details = {"error": str(e)}
        logger.error(f"Elasticsearch client not available for health check: {e}", exc_info=True)
    except Exception as e:
        es_status = "error"
        es_details = {"error": str(e)}
        logger.error(f"Elasticsearch health check failed: {e}", exc_info=True)

    # Check Analytics MongoDB if enabled
    if settings.MONGODB_ANALYTICS_ENABLED:
        try:
            if AnalyticsDataStorage.db: # Check if db object exists
                await AnalyticsDataStorage.db.command('ping')
                analytics_db_status = "connected"
            else: # Should not happen if startup was successful and analytics enabled
                analytics_db_status = "not_initialized"
                analytics_db_details = {"error": "Analytics DB client not initialized in app state."}
                logger.error("Analytics DB client not found in app state for health check.")
        except Exception as e:
            analytics_db_status = "error"
            analytics_db_details = {"error": str(e)}
            logger.error(f"Analytics MongoDB health check failed: {e}", exc_info=True)

    overall_status = "healthy"
    if es_status != "connected" or \
       (settings.MONGODB_ANALYTICS_ENABLED and analytics_db_status != "connected"):
        overall_status = "unhealthy"

    response_payload = {
        "status": overall_status,
        "service": settings.PROJECT_NAME,
        "version": settings.PROJECT_VERSION,
        "dependencies": {
            "elasticsearch": {"status": es_status, "details": es_details if es_status != 'connected' else 'OK'}
        }
    }
    if settings.MONGODB_ANALYTICS_ENABLED:
        response_payload["dependencies"]["mongodb_analytics"] = {"status": analytics_db_status, "details": analytics_db_details if analytics_db_status != 'connected' else 'OK'}

    if overall_status == "healthy":
        return response_payload
    else:
        return JSONResponse(
            status_code=http_status.HTTP_503_SERVICE_UNAVAILABLE,
            content=response_payload
        )

# Global Exception Handlers
@app.exception_handler(StarletteHTTPException)
async def custom_http_exception_handler(request: Request, exc: StarletteHTTPException):
    logger.error(f"HTTPException: {exc.status_code} {exc.detail}", url=str(request.url), status_code=exc.status_code, detail=exc.detail)
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    error_details = [{"field": " -> ".join(map(str, err["loc"])), "message": err["msg"], "type": err["type"]} for err in exc.errors()]
    logger.warning("RequestValidationError", url=str(request.url), errors=error_details, body=exc.body if hasattr(exc, 'body') else 'N/A')
    return JSONResponse(status_code=http_status.HTTP_422_UNPROCESSABLE_ENTITY, content={"detail": "Validation Error", "errors": error_details})

@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    logger.critical("Unhandled Exception", url=str(request.url), error=str(exc), exc_info=True)
    return JSONResponse(status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR, content={"detail": "An unexpected internal server error occurred."})

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) # Default port for FastAPI services
