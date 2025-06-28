from fastapi import APIRouter

from .gateway_router import router as gateway_api_router # For /api/* prefixed routes
from .health_router import router as health_router

# Main router for the application, can include others
# This is useful if you have non-prefixed routes or want to group them differently at app level.
# For now, gateway_router will handle /api and health_router /health.
# They will be included directly in main.py app.

# If you wanted a single router to include in main.py:
# main_app_router = APIRouter()
# main_app_router.include_router(gateway_api_router) # This would be prefixed by gateway_api_router itself if needed
# main_app_router.include_router(health_router)
