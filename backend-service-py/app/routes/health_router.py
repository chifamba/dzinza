from fastapi import APIRouter, status, Response
from app.core.config import settings
from datetime import datetime, timezone # Use timezone for consistency

router = APIRouter()

@router.get("/health", tags=["Health"], summary="Perform a Health Check")
async def health_check():
    """
    Performs a basic health check of the API Gateway.
    In a real scenario, this might also check connectivity to critical downstream services.
    """
    # TODO: Add checks for critical downstream services if necessary for gateway health
    # For now, just indicates the gateway itself is running.

    # Example of checking downstream (conceptual, needs actual async calls)
    # downstream_statuses = {}
    # async with httpx.AsyncClient(timeout=2.0) as client:
    #     for service_name, url in settings.SERVICES.model_dump().items():
    #         try:
    #             resp = await client.get(f"{str(url).rstrip('/')}/health")
    #             if resp.status_code == 200:
    #                 downstream_statuses[service_name] = "healthy"
    #             else:
    #                 downstream_statuses[service_name] = f"unhealthy_{resp.status_code}"
    #         except Exception:
    #             downstream_statuses[service_name] = "unreachable"

    return {
        "status": "healthy", # Or "degraded" if downstream checks fail
        "service_name": settings.OTEL_SERVICE_NAME,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "environment": settings.ENVIRONMENT,
        # "downstream_services": downstream_statuses # If checking downstream
        "version": "1.0.0" # Placeholder for actual service version
    }

@router.get("/ping", tags=["Health"], summary="Ping Pong Check")
async def ping():
    """Simple ping endpoint to check if service is responsive."""
    return {"message": "pong"}
