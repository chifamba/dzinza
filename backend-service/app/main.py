from fastapi import FastAPI, Request, HTTPException, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import httpx # For specific error types if handling them here
from datetime import datetime # For type hint, not directly used here but good practice if extending health check
from typing import Optional # For type hint, not directly used here but good practice if extending health check

from app.core.config import settings
from app.routes.gateway_router import router as gateway_api_router
from app.routes.health_router import router as health_router
from app.services.proxy_service import close_http_client # To close global httpx client
from app.utils.logger import logger
from app.utils.tracing import init_tracer, instrument_application_gateway
from app.utils.metrics import PrometheusMiddleware, get_metrics_handler # Using gateway-specific metrics
# from app.middleware.auth_middleware import ... # If adding global auth middleware
# from app.middleware.error_handler import GatewayErrorHandlerMiddleware # If using custom error middleware

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(f"Starting up {settings.PROJECT_NAME} (API Gateway) in {settings.ENVIRONMENT} mode...")

    # Initialize OpenTelemetry Tracer
    init_tracer()
    # Instrument FastAPI app and HTTPX client (used by proxy_service)
    instrument_application_gateway(app)

    # Any other startup tasks for the gateway (e.g., connecting to a config server, warming caches)
    # For now, primarily OTel and HTTPX client (which is global in proxy_service).

    logger.info("API Gateway startup complete.")
    yield
    # Clean up resources on shutdown
    logger.info(f"Shutting down {settings.PROJECT_NAME} (API Gateway)...")
    await close_http_client() # Close the global httpx client from proxy_service
    logger.info("API Gateway shutdown complete.")


app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_PREFIX}/docs/openapi.json", # Path for OpenAPI spec
    # docs_url=f"{settings.API_V1_PREFIX}/docs", # Path for Swagger UI
    # redoc_url=f"{settings.API_V1_PREFIX}/redoc", # Path for ReDoc
    # Note: If gateway serves docs for all services, it needs to aggregate OpenAPI specs.
    # For now, assume it serves its own, or downstream services serve their own /docs.
    # The original backend-service had swagger UI at /api/docs.
    # Let's make FastAPI serve its docs under /api/docs too.
    docs_url=f"{settings.API_V1_PREFIX}/docs",
    redoc_url=None, # Disable ReDoc for now unless needed
    lifespan=lifespan
)

# --- Middleware Order Matters ---

# 1. CORS Middleware (should be one of the first)
if settings.CORS_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[str(origin) for origin in settings.CORS_ORIGINS], # Handles AnyHttpUrl conversion
        allow_credentials=settings.CORS_ALLOW_CREDENTIALS,
        allow_methods=settings.CORS_ALLOW_METHODS,
        allow_headers=settings.CORS_ALLOW_HEADERS,
    )
else: # Default to a restrictive CORS policy if not configured explicitly
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"], # Or a more sensible default like only specific known frontends
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )


# 2. Prometheus Metrics Middleware (captures metrics for requests to gateway)
app.add_middleware(PrometheusMiddleware)

# 3. Custom Error Handling Middleware (optional, if not using @app.exception_handler sufficiently)
# from app.middleware.error_handler import GatewayErrorHandlerMiddleware
# app.add_middleware(GatewayErrorHandlerMiddleware) # This would catch before specific @app.exception_handlers

# 4. Authentication Middleware (optional: if gateway validates all tokens)
# from app.middleware.auth_middleware import JWTAuthMiddleware # Example if using a full middleware
# if settings.AUTH_SERVICE_JWT_SECRET_KEY: # Only add if configured to validate
#     app.add_middleware(JWTAuthMiddleware) # This would run for all routes after it.

# --- Exception Handlers ---
# These are generally preferred over error handling middleware for FastAPI for specific exception types.

@app.exception_handler(HTTPException)
async def custom_http_exception_handler(request: Request, exc: HTTPException):
    # This will handle HTTPErrors raised anywhere in FastAPI, including those from dependencies
    # or if re-raised by other middleware.
    logger.error(f"Gateway HTTPException: {exc.status_code} {exc.detail} for {request.method} {request.url.path}", exc_info=False if exc.status_code < 500 else True)
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": "ClientError", "message": exc.detail, "statusCode": exc.status_code}, # Example structured error
        headers=exc.headers,
    )

# Specific handlers for httpx errors if they are not caught and converted by proxy_service
@app.exception_handler(httpx.TimeoutException)
async def httpx_timeout_exception_handler(request: Request, exc: httpx.TimeoutException):
    logger.error(f"Gateway: Downstream service timeout: {exc.request.url}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_504_GATEWAY_TIMEOUT,
        content={"error": "GatewayTimeout", "message": f"Timeout connecting to downstream service: {exc.request.url}"},
    )

@app.exception_handler(httpx.ConnectError)
async def httpx_connect_error_handler(request: Request, exc: httpx.ConnectError):
    logger.error(f"Gateway: Downstream service connection error: {exc.request.url}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        content={"error": "ServiceUnavailable", "message": f"Could not connect to downstream service: {exc.request.url}"},
    )

@app.exception_handler(httpx.RequestError) # Catch other httpx request errors
async def httpx_request_error_handler(request: Request, exc: httpx.RequestError):
    logger.error(f"Gateway: Downstream service request error: {exc.request.url}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_502_BAD_GATEWAY,
        content={"error": "BadGateway", "message": f"Error communicating with downstream service: {exc.request.url}"},
    )

@app.exception_handler(Exception) # Catch-all for any other unhandled server errors
async def generic_server_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled Exception at Gateway: {exc} for {request.method} {request.url.path}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"error": "InternalServerError", "message": "An unexpected internal server error occurred at the API gateway."},
    )

# --- Routers ---
# Health check router (e.g., /health, /ping) - mounted at root
app.include_router(health_router)

# Main gateway router for all /api/* traffic
app.include_router(gateway_api_router, prefix=settings.API_V1_PREFIX)


# Root endpoint for basic info
@app.get("/", tags=["Root Gateway"])
async def read_root_gateway():
    return {
        "message": f"Welcome to {settings.PROJECT_NAME}",
        "environment": settings.ENVIRONMENT,
        "api_docs": app.docs_url, # Will be /api/docs
        "health_endpoint": "/health"
    }

# Metrics endpoint (e.g., /metrics) - mounted at root
metrics_handler = get_metrics_handler()
app.add_route("/metrics", metrics_handler, methods=["GET"])


# Update gateway_router.py to use the actual auth dependency from app.middleware.auth_middleware
# This step is crucial if gateway router's placeholder dependencies are to be replaced.
# The current gateway_router.py defines its own placeholder.
# It should import from `app.middleware.auth_middleware.py` if gateway-level auth is desired on specific proxy routes.
# For now, the gateway_router.py's placeholder is sufficient to show structure.
# If `AUTH_SERVICE_JWT_SECRET_KEY` is set, the `get_current_user_id_optional_dependency` in `auth_middleware.py`
# will perform validation for any route that uses it. If not set, it passes through.
# The proxy routes in `gateway_router.py` *do not* currently use this dependency, meaning they just pass Authorization headers.
# This is a common pattern: gateway handles routing, SSL, rate limiting, some caching, while auth is by end-services.
# If gateway *must* authenticate, the dependency should be added to the proxy route definitions in `gateway_router.py`.
# E.g. `current_user: Optional[uuid.UUID] = Depends(get_current_user_id_optional_dependency)` on proxy functions.
