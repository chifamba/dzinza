from fastapi import APIRouter

from .files_router import router as files_router
# from .media_router import router as media_router # If media has distinct logic from files
from .admin_router import router as admin_router

api_v1_router = APIRouter()

api_v1_router.include_router(files_router, prefix="/files", tags=["Files & Media"])
# If media_router is separate:
# api_v1_router.include_router(media_router, prefix="/media", tags=["Media Processing"]) # Example
api_v1_router.include_router(admin_router, prefix="/admin/storage", tags=["Storage Admin"])

# The original service had /files and /media routes.
# For now, most general file operations (upload, download, metadata) can be in files_router.
# media_router could be for specific media processing tasks if needed, or files_router handles all.
# Let's assume files_router covers both for now, similar to original structure where files.ts might handle all.
