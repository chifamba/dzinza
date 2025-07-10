"""
Main FastAPI application for the search service.
"""
import structlog
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.openapi.docs import get_swagger_ui_html
from fastapi.openapi.utils import get_openapi
from starlette_prometheus import PrometheusMiddleware

from .core.config import settings
from .services.elasticsearch_client import ElasticsearchClientSingleton
from .services.analytics import AnalyticsDataStorage
from .middleware.logging import RequestLoggingMiddleware
from .api.endpoints import router

# Configure structured logging
structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.UnicodeDecoder(),
        structlog.processors.JSONRenderer()
    ],
    wrapper_class=structlog.stdlib.BoundLogger,
    logger_factory=structlog.stdlib.LoggerFactory(),
    cache_logger_on_first_use=True,
)

logger = structlog.get_logger(__name__)

# Global service instances
es_singleton = ElasticsearchClientSingleton()
analytics_storage = AnalyticsDataStorage()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifecycle."""
    # Startup
    logger.info("Starting up search service")
    
    # Initialize Elasticsearch
    if not es_singleton.initialize():
        logger.error("Failed to initialize Elasticsearch - service may be degraded")
    
    # Initialize MongoDB Analytics
    if not await analytics_storage.initialize():
        logger.error("Failed to initialize MongoDB analytics - disabled")
    
    logger.info("Search service startup complete")
    
    yield
    
    # Shutdown
    logger.info("Shutting down search service")
    es_singleton.close()
    await analytics_storage.close()
    logger.info("Search service shutdown complete")


# Global exception handler
async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Global exception handler for consistent error responses."""
    logger.error(
        "Unhandled exception",
        error=str(exc),
        url=str(request.url),
        method=request.method,
        exc_info=True
    )
    
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal Server Error",
            "message": "An unexpected error occurred",
            "details": {"type": type(exc).__name__} if settings.DEBUG else None
        }
    )


# Create FastAPI application
app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.PROJECT_VERSION,
    description="Search service for the Dzinza genealogy platform",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url=None,  # We'll create our own docs endpoint
    redoc_url=None,
    lifespan=lifespan,
)

# Add middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

if settings.ENABLE_METRICS:
    app.add_middleware(PrometheusMiddleware)

app.add_middleware(RequestLoggingMiddleware)

# Add exception handlers
app.add_exception_handler(Exception, global_exception_handler)

# Include API routes
app.include_router(router)


# Custom Swagger UI
@app.get("/docs", include_in_schema=False)
async def custom_swagger_ui_html():
    """Custom Swagger UI endpoint."""
    return get_swagger_ui_html(
        openapi_url=app.openapi_url,
        title=app.title + " - Swagger UI",
        oauth2_redirect_url=app.swagger_ui_oauth2_redirect_url,
        swagger_js_url="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js",
        swagger_css_url="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css",
    )


def custom_openapi():
    """Custom OpenAPI schema."""
    if app.openapi_schema:
        return app.openapi_schema
    
    openapi_schema = get_openapi(
        title=app.title,
        version=app.version,
        description=app.description,
        routes=app.routes,
    )
    
    # Add security schemes
    openapi_schema["components"]["securitySchemes"] = {
        "Bearer": {
            "type": "http",
            "scheme": "bearer",
            "bearerFormat": "JWT",
            "description": "Enter JWT token"
        }
    }
    
    # Add security to all endpoints except health and metrics
    for path, methods in openapi_schema["paths"].items():
        if path not in ["/health", "/metrics", "/docs"]:
            for method in methods.values():
                if isinstance(method, dict) and "security" not in method:
                    method["security"] = [{"Bearer": []}]
    
    app.openapi_schema = openapi_schema
    return app.openapi_schema


app.openapi = custom_openapi


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG,
        log_level="info"
    )
