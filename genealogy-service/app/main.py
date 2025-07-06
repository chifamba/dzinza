from fastapi import FastAPI, Request, status as http_status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException
from fastapi.exceptions import RequestValidationError
import structlog

from app.core.config import settings
from app.db.base import connect_to_mongo, close_mongo_connection, get_database # Import DB functions
from app.api.api_v1.api import api_router as v1_api_router # Import the main v1 API router
# from app.services.celery_app import startup_celery_worker, shutdown_celery_worker # For Celery

# Configure structlog (similar to other services)
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
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    redirect_slashes=False
)

@app.on_event("startup")
async def startup_event():
    logger.info("Genealogy service startup...")
    try:
        await connect_to_mongo()
        # TODO: await startup_celery_worker() # If managing worker lifecycle with app
        logger.info("MongoDB connection established and service ready.")
    except Exception as e:
        logger.critical("Failed to initialize service during startup.", error=str(e), exc_info=True)
        # Depending on the severity, you might want to exit or prevent the app from starting fully
        # For now, just logging critical error.
        # raise # Re-raise if you want startup to fail hard

@app.on_event("shutdown")
async def shutdown_event():
    logger.info("Genealogy service shutdown...")
    # TODO: await shutdown_celery_worker()
    await close_mongo_connection()
    logger.info("MongoDB connection closed and service shut down.")

# TODO: Add Prometheus and OpenTelemetry middleware if needed, similar to auth/storage services

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
app.include_router(v1_api_router, prefix=settings.API_V1_STR)

@app.get("/health", tags=["System"])
async def health_check():
    logger.debug("Health check accessed")
    db_status = "connected"
    db_details = {}
    try:
        db = get_database() # Get DB instance from DataStorage
        await db.command('ping') # Ping MongoDB
        logger.debug("MongoDB ping successful in health check.")
    except Exception as e:
        db_status = "error"
        db_details = {"error": str(e)}
        logger.error("MongoDB ping failed in health check.", error=str(e), exc_info=True)

    # TODO: Add Celery broker health check if applicable

    if db_status == "connected": # Add other critical services to this check
        return {"status": "healthy", "service": settings.PROJECT_NAME, "version": settings.PROJECT_VERSION, "mongodb": db_status}
    else:
        return JSONResponse(
            status_code=http_status.HTTP_503_SERVICE_UNAVAILABLE,
            content={
                "status": "unhealthy",
                "service": settings.PROJECT_NAME,
                "version": settings.PROJECT_VERSION,
                "mongodb": db_status,
                "mongodb_details": db_details if db_status == "error" else "N/A"
                # "celery_broker": "TODO"
            }
        )

# Global Exception Handlers (similar to other services)
@app.exception_handler(StarletteHTTPException)
async def custom_http_exception_handler(request: Request, exc: StarletteHTTPException):
    logger.error(f"HTTPException: {exc.status_code} {exc.detail}", url=str(request.url), status_code=exc.status_code, detail=exc.detail)
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
    logger.warning("RequestValidationError", url=str(request.url), errors=error_details, body=exc.body if hasattr(exc, 'body') else 'N/A')
    return JSONResponse(
        status_code=http_status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": "Validation Error", "errors": error_details},
    )

@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    logger.critical("Unhandled Exception", url=str(request.url), error=str(exc), exc_info=True)
    return JSONResponse(
        status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "An unexpected internal server error occurred."},
    )

if __name__ == "__main__":
    import uvicorn
    # Default port for uvicorn is 8000.
    # Might need to pass settings.PORT if defined and uvicorn is run from here.
    uvicorn.run(app, host="0.0.0.0", port=8000)
