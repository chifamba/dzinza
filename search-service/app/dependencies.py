# search-service/app/dependencies.py
# Placeholder for common dependencies like get_current_user.
# This service will also need an Elasticsearch client dependency.

from app.services.elasticsearch_client import get_es_client_dependency
from elasticsearch import AsyncElasticsearch

# Example dependency for FastAPI
async def get_elasticsearch_client() -> AsyncElasticsearch:
    return get_es_client_dependency()

# Add stubs for AuthenticatedUser and get_current_active_user to fix import errors in endpoints/search.py
class AuthenticatedUser:
    id: str = "anonymous"

def get_current_active_user(request):
    # Dummy implementation for now
    return AuthenticatedUser()
