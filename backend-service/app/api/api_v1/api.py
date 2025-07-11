from fastapi import APIRouter
from app.api.api_v1.endpoints import gateway # Import the gateway endpoint module

api_router = APIRouter()

# Include the gateway router.
# Since the gateway endpoint uses /{path:path}, it should typically be included
# without a prefix at this v1 level, or with a prefix that represents the version segment.
# If this api_router is mounted at "/api/v1" in main.py, and gateway.router handles "/{path:path}",
# then requests to "/api/v1/..." will be handled by gateway.router.
api_router.include_router(gateway.router)

# If there were other v1-specific, non-proxied utility endpoints for the gateway,
# they could be defined here or in separate endpoint modules and included.
# For example:
# from app.api.api_v1.endpoints import status
# api_router.include_router(status.router, prefix="/status", tags=["Gateway Status"])
