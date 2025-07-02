from fastapi import FastAPI, Depends, HTTPException, status, Request
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from . import models, schemas, crud, utils
from .database import SessionLocal, engine, get_db # get_db is used by endpoints
from .config import settings
from .api_v1.api import api_router # Import the main API router
from starlette_prometheus import PrometheusMiddleware, metrics # For Prometheus
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor # For OpenTelemetry

# Create database tables if they don't exist (for local dev without Alembic initially)
# In a production setup, Alembic migrations would handle this if not managed externally.
# Consider if this should be run here or as a separate startup script/Alembic command.
# For now, keeping it commented as per previous state.
# models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.PROJECT_VERSION,
    debug=settings.DEBUG,
    openapi_url="/api/v1/openapi.json" # Standardized OpenAPI URL
)

# Prometheus Middleware
app.add_middleware(PrometheusMiddleware)
app.add_route("/metrics", metrics) # Expose /metrics endpoint for Prometheus

# OpenTelemetry Instrumentation
if settings.ENABLE_TRACING:
    FastAPIInstrumentor.instrument_app(app)
    # Configure exporter if not done globally or via env vars by auto-instrumentation
    # from opentelemetry import trace
    # from opentelemetry.sdk.trace import TracerProvider
    # from opentelemetry.sdk.trace.export import BatchSpanProcessor
    # from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
    # from opentelemetry.sdk.resources import Resource

    # resource = Resource(attributes={
    #     "service.name": settings.OTEL_SERVICE_NAME
    # })
    # provider = TracerProvider(resource=resource)
    # processor = BatchSpanProcessor(OTLPSpanExporter(endpoint=settings.JAEGER_ENDPOINT))
    # provider.add_span_processor(processor)
    # trace.set_tracer_provider(provider)
    # print(f"OpenTelemetry tracing enabled for {settings.OTEL_SERVICE_NAME}, exporting to {settings.JAEGER_ENDPOINT}")


# CORS Middleware
if settings.ALLOWED_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[str(origin) for origin in settings.ALLOWED_ORIGINS], # Allows string origins
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

# Include the API router
app.include_router(api_router, prefix="/api/v1")


# Basic Health Check (can be part of the main app or a system router)
@app.get("/health", response_model=schemas.MessageResponse, tags=["System"])
async def health_check():
    """
    Health check endpoint.
    """
    # TODO: Add checks for DB, Redis connectivity if needed for a more comprehensive health check
    return {"message": f"{settings.PROJECT_NAME} is healthy and running!"}


# Remove the temporary /users_test/ endpoint as it's now handled by the API router
# @app.post("/users_test/", response_model=schemas.UserResponse, tags=["Test Users (Temporary)"])
# def create_user_test(user: schemas.UserCreate, db: Session = Depends(get_db)):
#     """
#     Test endpoint to create a new user.
#     This will be moved to a proper API router.
#     """
#     db_user = crud.get_user_by_email(db, email=user.email)
#     if db_user:
#         raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")
#
#     hashed_password = utils.hash_password(user.password)
#
#     # Create a dictionary for user creation data matching the model
#     user_create_data = user.model_dump()
#     del user_create_data['password'] # Remove plain password
#
#     db_user_model = models.User(
#         **user_create_data,
#         password_hash=hashed_password,
#         is_active=True, # Default to active for this test
#         email_verified=False # Default
#     )
#     db.add(db_user_model)
#     db.commit()
#     db.refresh(db_user_model)
#     return db_user_model

# Global Exception Handlers
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    # Log the exception details here using your logger
    # logger.error(f"HTTPException: {exc.status_code} {exc.detail}", extra={"request_url": request.url})
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail}, # Consistent error response
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    # Log the validation errors here
    # logger.warning(f"RequestValidationError: {exc.errors()}", extra={"request_url": request.url, "body": exc.body})
    # Provide a more structured error response for validation errors
    error_details = []
    for error in exc.errors():
        field = " -> ".join(map(str, error["loc"])) if error["loc"] else "body"
        error_details.append({"field": field, "message": error["msg"], "type": error["type"]})

    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "detail": "Validation Error",
            "errors": error_details
        },
    )

@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    # Log the unexpected error here
    # logger.critical(f"Unhandled Exception: {exc}", exc_info=True, extra={"request_url": request.url})
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "An unexpected internal server error occurred."},
    )


if __name__ == "__main__":
    import uvicorn
    # This is for running directly with `python main.py` for local dev,
    # uvicorn command in Dockerfile is preferred for containerized deployment.
    uvicorn.run(app, host="0.0.0.0", port=8000)
