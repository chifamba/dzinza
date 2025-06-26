from fastapi import APIRouter, Request, Depends
from fastapi.responses import StreamingResponse, Response as FastAPIResponse
from typing import Optional
import uuid

from app.services.proxy_service import forward_request
from app.core.config import settings
from app.middleware.auth_middleware import get_current_user_id_optional_dependency # Actual dependency
from app.utils.logger import logger

CurrentUserUUIDOptional = Depends(get_current_user_id_optional_dependency)

router = APIRouter()

# Path prefixes for downstream services (relative to the gateway's API_V1_PREFIX)
AUTH_SERVICE_PATH_PREFIX = "/auth"
GENEALOGY_SERVICE_PATH_PREFIX = "/genealogy"
NOTIFICATIONS_PATH_PREFIX = "/notifications"
STORAGE_SERVICE_PATH_PREFIX = "/storage"
SEARCH_SERVICE_PATH_PREFIX = "/search"


# --- Proxy Route Definitions ---

@router.api_route(f"{AUTH_SERVICE_PATH_PREFIX}{{path_suffix:path}}", methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"])
async def proxy_auth_service(
    request: Request,
    path_suffix: str,
    # current_user_id: Optional[uuid.UUID] = CurrentUserUUIDOptional # Available if gateway validates
):
    effective_target_path = f"/api/v1{AUTH_SERVICE_PATH_PREFIX.rstrip('/')}{path_suffix}"
    logger.info(f"Proxying to Auth: {request.method} {settings.SERVICES.AUTH_SERVICE_URL}{effective_target_path}")
    return await forward_request(
        request,
        target_base_url=str(settings.SERVICES.AUTH_SERVICE_URL),
        target_path=effective_target_path
    )

@router.api_route(f"{GENEALOGY_SERVICE_PATH_PREFIX}{{path_suffix:path}}", methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"])
async def proxy_genealogy_service(
    request: Request,
    path_suffix: str,
    # current_user_id: Optional[uuid.UUID] = CurrentUserUUIDOptional
):
    effective_target_path = f"/api/v1{GENEALOGY_SERVICE_PATH_PREFIX.rstrip('/')}{path_suffix}"
    logger.info(f"Proxying to Genealogy: {request.method} {settings.SERVICES.GENEALOGY_SERVICE_URL}{effective_target_path}")
    return await forward_request(
        request,
        target_base_url=str(settings.SERVICES.GENEALOGY_SERVICE_URL),
        target_path=effective_target_path
    )

@router.api_route(f"{NOTIFICATIONS_PATH_PREFIX}{{path_suffix:path}}", methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"])
async def proxy_notifications_service(
    request: Request,
    path_suffix: str,
    # current_user_id: Optional[uuid.UUID] = CurrentUserUUIDOptional
):
    # Notifications are on genealogy service, at path /api/v1/notifications
    effective_target_path = f"/api/v1{NOTIFICATIONS_PATH_PREFIX.rstrip('/')}{path_suffix}"
    logger.info(f"Proxying Notifications (to Genealogy): {request.method} {settings.SERVICES.GENEALOGY_SERVICE_URL}{effective_target_path}")
    return await forward_request(
        request,
        target_base_url=str(settings.SERVICES.GENEALOGY_SERVICE_URL),
        target_path=effective_target_path
    )

@router.api_route(f"{STORAGE_SERVICE_PATH_PREFIX}{{path_suffix:path}}", methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"])
async def proxy_storage_service(
    request: Request,
    path_suffix: str,
    # current_user_id: Optional[uuid.UUID] = CurrentUserUUIDOptional
):
    effective_target_path = f"/api/v1{STORAGE_SERVICE_PATH_PREFIX.rstrip('/')}{path_suffix}"
    logger.info(f"Proxying to Storage: {request.method} {settings.SERVICES.STORAGE_SERVICE_URL}{effective_target_path}")
    return await forward_request(
        request,
        target_base_url=str(settings.SERVICES.STORAGE_SERVICE_URL),
        target_path=effective_target_path
    )

@router.api_route(f"{SEARCH_SERVICE_PATH_PREFIX}{{path_suffix:path}}", methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"])
async def proxy_search_service(
    request: Request,
    path_suffix: str,
    # current_user_id: Optional[uuid.UUID] = CurrentUserUUIDOptional
):
    effective_target_path = f"/api/v1{SEARCH_SERVICE_PATH_PREFIX.rstrip('/')}{path_suffix}"
    logger.info(f"Proxying to Search: {request.method} {settings.SERVICES.SEARCH_SERVICE_URL}{effective_target_path}")
    return await forward_request(
        request,
        target_base_url=str(settings.SERVICES.SEARCH_SERVICE_URL),
        target_path=effective_target_path
    )
