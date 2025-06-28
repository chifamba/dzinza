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

# Placeholder for JWT token-based authentication dependency
# This would typically be in a shared module or auth_dependencies.py
from app.core.security import verify_token
from app.core.config import settings as app_settings # renamed to avoid conflict
from app.crud import user_crud as app_user_crud # renamed
from app.db.models.user_model import User as DBUser #renamed
from fastapi.security import OAuth2PasswordBearer

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{app_settings.API_V1_STR}/auth/login") # tokenUrl is where client gets token

async def get_current_user_dependency(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db_session)
) -> DBUser:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    payload = verify_token(token, app_settings.JWT_SECRET_KEY)
    if payload is None or payload.get("type") != "access":
        logger.warning(f"Invalid access token received or non-access token used. Payload: {payload}")
        raise credentials_exception

    user_id_str: Optional[str] = payload.get("sub")
    if user_id_str is None:
        logger.warning("User ID (sub) not found in token payload.")
        raise credentials_exception

    try:
        user_id = uuid.UUID(user_id_str)
    except ValueError:
        logger.warning(f"Invalid user ID format in token: {user_id_str}")
        raise credentials_exception

    user = await app_user_crud.get_user_by_id(db, user_id=user_id)
    if user is None:
        logger.warning(f"User not found for ID from token: {user_id}")
        raise credentials_exception
    return user

async def get_current_active_user_dependency(
    current_user: DBUser = Depends(get_current_user_dependency)
) -> DBUser:
    if not current_user.is_active:
        logger.warning(f"Authentication attempt by inactive user: {current_user.email}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Inactive user")
    return current_user

async def get_current_admin_user_dependency(
    current_user: DBUser = Depends(get_current_active_user_dependency)
) -> DBUser:
    if current_user.role not in [UserRole.ADMIN, UserRole.SUPER_ADMIN]:
        logger.warning(f"Admin access denied for user {current_user.email} with role {current_user.role}")
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not enough privileges")
    return current_user


# Now, I need to go back and update the routers to use these actual dependencies.
# This is a bit of a chicken-and-egg problem when creating files sequentially.
# For now, the routers have placeholder dependencies. This `main.py` defines the real ones.
# In a real workflow, I'd update the routers after defining these here.
from datetime import datetime # for health check timestamp
from app.db.models.user_model import UserRole # for admin dependency
import uuid # for user_id in token dependency
from typing import Optional # for user_id_str in token dependency
from sqlalchemy.ext.asyncio import AsyncSession # for db session in dependencies
from app.db.database import get_db_session # for db session in dependencies
