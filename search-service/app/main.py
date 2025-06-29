from fastapi import FastAPI, Request, status as http_status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException
from fastapi.exceptions import RequestValidationError
import structlog

from app.core.config import settings
# from app.services.elasticsearch_client import init_es_client, close_es_client, get_es_client # To be created
# from app.db.analytics_db import connect_to_mongo_analytics, close_mongo_analytics_connection, get_analytics_db # If using MongoDB for analytics

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

# @app.on_event("startup")
# async def startup_event():
#     logger.info(f"{settings.PROJECT_NAME} startup...")
#     await init_es_client() # Initialize Elasticsearch client
#     if settings.MONGODB_ANALYTICS_ENABLED:
#         await connect_to_mongo_analytics()
#     logger.info("Elasticsearch client initialized. Analytics DB connected if enabled.")

# @app.on_event("shutdown")
# async def shutdown_event():
#     logger.info(f"{settings.PROJECT_NAME} shutdown...")
#     await close_es_client()
#     if settings.MONGODB_ANALYTICS_ENABLED:
#         await close_mongo_analytics_connection()
#     logger.info("Elasticsearch client closed. Analytics DB connection closed if enabled.")

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

# TODO: Include the API router (e.g., from app.api.api_v1.api import api_router)
# app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/health", tags=["System"])
async def health_check():
    logger.debug("Health check accessed")
    es_status = "connected" # Placeholder
    # try:
    #     es_client = get_es_client()
    #     if not await es_client.ping():
    #         raise Exception("Elasticsearch ping failed")
    #     logger.debug("Elasticsearch ping successful in health check.")
    # except Exception as e:
    #     es_status = "error"
    #     logger.error(f"Elasticsearch health check failed: {e}", exc_info=True)

    # TODO: Add MongoDB analytics DB health check if enabled

    # For now, basic health check
    if es_status == "connected": # Add other checks
        return {"status": "healthy", "service": settings.PROJECT_NAME, "version": settings.PROJECT_VERSION, "elasticsearch": es_status}
    else:
        return JSONResponse(
            status_code=http_status.HTTP_503_SERVICE_UNAVAILABLE,
            content={
                "status": "unhealthy",
                "service": settings.PROJECT_NAME,
                "version": settings.PROJECT_VERSION,
                "elasticsearch": es_status
            }
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
