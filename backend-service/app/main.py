from fastapi import FastAPI, Request, status as http_status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse # Added Response
from starlette.exceptions import HTTPException as StarletteHTTPException
from fastapi.exceptions import RequestValidationError
import httpx # HTTP client for proxying
import structlog
import time # For X-Response-Time header

from app.core.config import settings
# from app.services.proxy import reverse_proxy # To be created
from app.middleware.rate_limiter import limiter as app_limiter # Import the limiter instance
from slowapi.errors import RateLimitExceeded # Import the exception
from slowapi import _rate_limit_exceeded_handler # Import the default handler


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
    # openapi_url=f"{settings.API_V1_STR}/openapi.json" # Gateway might not expose its own OpenAPI, or might aggregate others
    openapi_url=None # Disable gateway's own OpenAPI page by default
)

# --- HTTP Client Lifecycle for Proxy ---
# It's good practice to use a single httpx.AsyncClient instance for the app's lifecycle
# to benefit from connection pooling.
@app.on_event("startup")
async def startup_event():
    logger.info(f"{settings.PROJECT_NAME} startup...")
    app.state.http_client = httpx.AsyncClient(timeout=settings.SERVICE_TIMEOUT_SECONDS)
    if settings.ENABLE_RATE_LIMITING:
        app.state.limiter = app_limiter # Attach limiter to app state
        app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler) # Add exception handler
        logger.info("Rate limiter initialized and attached to app state.")
    logger.info("HTTPX AsyncClient initialized for proxying.")
    # TODO: Initialize JWT public key if using asymmetric algo & key is from file/service

@app.on_event("shutdown")
async def shutdown_event():
    logger.info(f"{settings.PROJECT_NAME} shutdown...")
    if hasattr(app.state, 'http_client') and app.state.http_client:
        await app.state.http_client.aclose()
        logger.info("HTTPX AsyncClient closed.")

# --- Middleware ---

# IMPORTANT: Order of middleware can matter.
# CORS should usually be early.
# Response Time can be early.
# Auth should be after CORS, but before routes that need auth state.

# CORS Middleware
if settings.ALLOWED_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[str(origin) for origin in settings.ALLOWED_ORIGINS], # Or specific origins
        allow_credentials=True,
        allow_methods=["*"], # Allows all methods
        allow_headers=["*"], # Allows all headers
        expose_headers=["X-Response-Time"] # Example of exposing custom headers
    )

# Response Time Header
@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    response.headers["X-Response-Time"] = str(process_time)
    return response

# Security Headers Middleware (FastAPI style)
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    # response.headers["Content-Security-Policy"] = "default-src 'self'; script-src 'self'; object-src 'none'; style-src 'self' 'unsafe-inline'; img-src 'self' data:;"  # Example CSP
    response.headers["X-XSS-Protection"] = "1; mode=block"
    # response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    # response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    return response

# Authentication Middleware (if gateway handles token validation)
# app.add_middleware(AuthMiddleware) # This will be applied at the endpoint level

# --- Health Check for the Gateway itself ---
# Note: If the gateway router is mounted at root "/", this /health endpoint needs to be defined
# *before* the gateway router is included, or it needs its own distinct prefix
# not caught by the proxy's /{path:path}.
# For now, assuming it's fine or gateway router will be prefixed.
@app.get(f"{settings.API_V1_STR}/gateway/health", tags=["Gateway System"]) # Specific path for gateway health
async def health_check():
    logger.debug("API Gateway health check accessed")
    return {"status": "healthy", "service_name": settings.PROJECT_NAME, "version": settings.PROJECT_VERSION}

# --- Main Proxy Router ---
from app.api.api_v1.api import api_router as v1_api_router # Import the v1 api_router which includes the gateway catch-all
# Mount the main v1 router. If settings.API_V1_STR is "/api/v1", then requests to
# /api/v1/auth/*, /api/v1/genealogy/* etc. will be handled.
app.include_router(v1_api_router, prefix=settings.API_V1_STR)


# Global Exception Handlers (similar to other services)
@app.exception_handler(StarletteHTTPException)
async def custom_http_exception_handler(request: Request, exc: StarletteHTTPException):
    logger.error("Gateway StarletteHTTPException", url=str(request.url), status_code=exc.status_code, detail=exc.detail)
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail, "error_source": "api-gateway"})

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    error_details = [{"field": " -> ".join(map(str, err["loc"])), "message": err["msg"], "type": err["type"]} for err in exc.errors()]
    logger.warning("Gateway RequestValidationError", url=str(request.url), errors=error_details)
    return JSONResponse(status_code=http_status.HTTP_422_UNPROCESSABLE_ENTITY, content={"detail": "Validation Error", "errors": error_details, "error_source": "api-gateway"})

@app.exception_handler(httpx.HTTPStatusError) # Handle errors from downstream services
async def httpx_status_error_handler(request: Request, exc: httpx.HTTPStatusError):
    logger.error(
        "Downstream service error (HTTPStatusError)",
        url=str(exc.request.url),
        status_code=exc.response.status_code,
        response_text=exc.response.text[:500] # Log first 500 chars of response
    )
    # Attempt to mirror downstream service's response if possible and safe
    # Avoid directly returning exc.response.text if it could contain sensitive info not meant for client
    # or if content type is not application/json.
    # For now, return a generic error or a sanitized version of the downstream error.
    return JSONResponse(
        status_code=exc.response.status_code, # Mirror status code
        content={"detail": f"Error from downstream service: {exc.response.reason_phrase}", "error_source": str(exc.request.url)}
    )

@app.exception_handler(httpx.RequestError) # Handle network errors when calling downstream
async def httpx_request_error_handler(request: Request, exc: httpx.RequestError):
    logger.error(
        "Downstream service connection error (RequestError)",
        url=str(exc.request.url),
        error=str(exc)
    )
    return JSONResponse(
        status_code=http_status.HTTP_503_SERVICE_UNAVAILABLE,
        content={"detail": "Service unavailable: could not connect to downstream service.", "error_source": str(exc.request.url)}
    )

@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    logger.critical("Gateway Unhandled Exception", url=str(request.url), error=str(exc), exc_info=True)
    return JSONResponse(status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR, content={"detail": "An unexpected internal server error occurred at the gateway.", "error_source": "api-gateway"})


if __name__ == "__main__":
    import uvicorn
    # The gateway often runs on a common port like 80 or 8000 (if no other reverse proxy like Nginx in front)
    # Port 3001 was used by Node gateway in original docker-compose.
    # FastAPI default is 8000.
    uvicorn.run(app, host="0.0.0.0", port=8000)
