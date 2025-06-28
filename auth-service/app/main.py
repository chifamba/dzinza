from fastapi import FastAPI, Depends, HTTPException, status, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.core.config import settings
from app.api.v1 import api_v1_router
from app.db.database import engine as db_engine # For SQLAlchemy instrumentation
from app.utils.logger import logger
from app.utils.tracing import init_tracer, instrument_fastapi_app
from app.utils.metrics import PrometheusMiddleware, get_metrics_handler
from app.db.database import Base # Import Base for table creation
# from app.db.database import sync_engine # For Alembic if migrations are run from app (not recommended for prod)


# alembic_cfg = Config("alembic.ini") # If using alembic commands programmatically

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(f"Starting up {settings.PROJECT_NAME} in {settings.ENVIRONMENT} mode...")

    # Initialize OpenTelemetry Tracer
    init_tracer() # Initializes based on settings.ENABLE_TRACING

    # Instrument FastAPI app and other libraries (SQLAlchemy, Redis, HTTPX)
    # SQLAlchemy needs the engine to be available.
    instrument_fastapi_app(app) # Must be called after tracer init and before app starts fully

    # Instrument SQLAlchemy (if not done by instrument_fastapi_app or if engine is created later)
    # from opentelemetry.instrumentation.sqlalchemy import SQLAlchemyInstrumentor
    # if settings.ENABLE_TRACING:
    #     SQLAlchemyInstrumentor().instrument(engine=db_engine) # Ensure db_engine is initialized

    # Database table creation (for development/testing, use Alembic for production)
    if settings.ENVIRONMENT == "development":
        async with db_engine.begin() as conn:
            # await conn.run_sync(Base.metadata.drop_all) # Use with caution
            await conn.run_sync(Base.metadata.create_all)
            logger.info("Database tables created (development mode).")

    # TODO: Initialize Redis connection pool if needed globally
    # app.state.redis = await redis.from_url(str(settings.REDIS_URI), encoding="utf8", decode_responses=True)

    logger.info("Application startup complete.")
    yield
    # Clean up resources on shutdown
    logger.info(f"Shutting down {settings.PROJECT_NAME}...")
    # if hasattr(app.state, 'redis') and app.state.redis:
    #    await app.state.redis.close()
    #    logger.info("Redis connection closed.")
    await db_engine.dispose()
    logger.info("Database engine disposed.")
    logger.info("Application shutdown complete.")


app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan
)

# Middleware
# CORS
if settings.CORS_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[str(origin) for origin in settings.CORS_ORIGINS],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

# Prometheus Metrics Middleware
app.add_middleware(PrometheusMiddleware)

# Custom Error Handler (Example)
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    # Log the error using the main app logger or a specific error logger
    logger.error(f"HTTPException: {exc.status_code} {exc.detail} for {request.method} {request.url}")
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
        headers=exc.headers,
    )

@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled Exception: {exc} for {request.method} {request.url}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "An unexpected internal server error occurred."},
    )

# Routers
app.include_router(api_v1_router, prefix=settings.API_V1_STR)

# Metrics endpoint
metrics_handler = get_metrics_handler()
app.add_route("/metrics", metrics_handler, methods=["GET"])


@app.get("/", tags=["Root"])
async def read_root():
    return {
        "message": f"Welcome to {settings.PROJECT_NAME}",
        "environment": settings.ENVIRONMENT,
        "docs_url": "/docs",
        "openapi_url": app.openapi_url
    }

@app.get("/health", tags=["Health"])
async def health_check():
    # TODO: Add checks for database, Redis, etc.
    return {
        "status": "healthy",
        "service": settings.OTEL_SERVICE_NAME,
        "timestamp": datetime.utcnow().isoformat(),
        "version": "1.0.0" # Replace with actual version
    }

# For running with uvicorn directly (e.g., uvicorn app.main:app --reload)
# if __name__ == "__main__":
#     import uvicorn
#     uvicorn.run(app, host="0.0.0.0", port=3002) # Match old auth-service port or choose new one

# Removed get_current_user_dependency, get_current_active_user_dependency, get_current_admin_user_dependency definitions (moved to app/dependencies/auth.py)

from datetime import datetime # for health check timestamp
