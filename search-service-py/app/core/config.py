from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import MongoDsn, AnyHttpUrl, HttpUrl # Added HttpUrl for ELASTICSEARCH_URL
from typing import List, Optional, Union

class Settings(BaseSettings):
    PROJECT_NAME: str = "Dzinza Search Service"
    API_V1_STR: str = "/api/v1" # Or match actual mount point if behind gateway
    ENVIRONMENT: str = "development"

    # Elasticsearch Configuration
    ELASTICSEARCH_URL: Union[HttpUrl, str] # e.g. "http://localhost:9200" or "https://user:pass@host:port"
    # ELASTICSEARCH_USERNAME: Optional[str] = None # If using basic auth with ES
    # ELASTICSEARCH_PASSWORD: Optional[str] = None
    # ELASTICSEARCH_API_KEY_ID: Optional[str] = None # If using API key auth
    # ELASTICSEARCH_API_KEY: Optional[str] = None
    # ELASTICSEARCH_CA_CERTS: Optional[str] = None # Path to CA cert for HTTPS

    # Index names (good practice to make them configurable)
    PERSON_INDEX_NAME: str = "dzinza_persons"
    FAMILY_TREE_INDEX_NAME: str = "dzinza_family_trees"
    # Add other index names as needed (e.g., historical_records, media_metadata)

    # MongoDB (if used for analytics or other metadata by search-service itself)
    MONGODB_URI: Optional[MongoDsn] = None # e.g. "mongodb://localhost:27017/dzinza_search_analytics"
    MONGODB_DATABASE_NAME: Optional[str] = "dzinza_search_analytics"

    # JWT settings (for validating tokens from auth-service)
    AUTH_SERVICE_JWT_SECRET_KEY: str # MUST match JWT_SECRET_KEY in auth-service
    ALGORITHM: str = "HS256"       # Must match auth-service algorithm

    # CORS
    CORS_ORIGINS: List[AnyHttpUrl] = []

    # Observability
    ENABLE_TRACING: bool = False
    JAEGER_ENDPOINT: str = "http://localhost:4318/v1/traces"
    OTEL_SERVICE_NAME: str = "search-service-py"

    # Data source service URLs (if search-service pulls data)
    GENEALOGY_SERVICE_BASE_URL: Optional[AnyHttpUrl] = None # e.g., http://genealogy-service-py:3004
    STORAGE_SERVICE_BASE_URL: Optional[AnyHttpUrl] = None   # e.g., http://storage-service-py:3005

    # Indexing settings
    INDEXING_BATCH_SIZE: int = 1000 # How many documents to fetch/index at a time
    # INDEXING_SCHEDULE_CRON: Optional[str] = None # If using scheduled re-indexing

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()
