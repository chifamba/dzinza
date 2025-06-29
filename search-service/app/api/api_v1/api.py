from fastapi import APIRouter
from app.api.api_v1.endpoints import search # Import the search endpoint module

api_router = APIRouter()

# Include the search router
# All search-related endpoints will be under this router's prefix (if any)
# plus the search.router's prefix (if any).
# Example: if api_router is at /api/v1 and search.router is at /search,
# then endpoints in search.py will be /api/v1/search/...
api_router.include_router(search.router, prefix="/search", tags=["Search"])

# Other potential v1 utility endpoints for the search service itself could go here.
