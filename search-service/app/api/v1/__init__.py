from fastapi import APIRouter

from .search_router import router as search_router
from .analytics_router import router as analytics_router # If analytics has its own router

api_v1_router = APIRouter()

api_v1_router.include_router(search_router, prefix="/search", tags=["Search"])
api_v1_router.include_router(analytics_router, prefix="/analytics", tags=["Search Analytics"])

# Original service had /search and /analytics routes.
# These are mapped here under /api/v1.
# The backend-service (API gateway) would then proxy /api/search -> search-service/api/v1/search.
