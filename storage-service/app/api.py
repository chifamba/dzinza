from fastapi import APIRouter

from app.endpoints import files as files_endpoints # Import the router from files.py

# This is the main API router for this service.
# It will include all other specific endpoint routers.
api_router = APIRouter()

api_router.include_router(files_endpoints.router, prefix="/files", tags=["Files"])

# Placeholder for other potential top-level routers in storage-service if any were to be added:
# e.g., media specific operations if they are substantially different from general files
# from .endpoints import media as media_router # Assuming you might create media.py
# api_router.include_router(media_router.router, prefix="/media", tags=["Media"])

# Placeholder for admin routes if specific to storage and not part of /files
# from .endpoints import admin as admin_router # Assuming you might create admin.py
# api_router.include_router(admin_router.router, prefix="/admin", tags=["Storage Admin"])

# The prefix "/api/v1" for all these routes will be applied when this api_router
# is included in the main FastAPI app instance in main.py.
