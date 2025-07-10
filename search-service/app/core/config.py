"""
Core configuration management for the search service.
"""
import os
from typing import List, Union
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings, loaded from environment variables or .env file."""
    
    # Application Settings
    PROJECT_NAME: str = "Dzinza Search Service"
    PROJECT_VERSION: str = "0.1.0"
    API_V1_STR: str = "/api/v1"
    DEBUG: bool = False
    
    # Elasticsearch Configuration
    ELASTICSEARCH_URL: str = "http://elasticsearch:9200"
    ELASTICSEARCH_USERNAME: str = "elastic"
    ELASTICSEARCH_PASSWORD: str = "changeme"
    ELASTICSEARCH_REQUEST_TIMEOUT: int = 30
    ELASTICSEARCH_MAX_RETRIES: int = 3
    ELASTICSEARCH_RETRY_ON_TIMEOUT: bool = True
    
    # Elasticsearch Indices
    ELASTICSEARCH_INDEX_PERSONS: str = "dzinza_persons"
    ELASTICSEARCH_INDEX_FAMILY_TREES: str = "dzinza_family_trees"
    ELASTICSEARCH_INDEX_EVENTS: str = "dzinza_events"
    ELASTICSEARCH_INDEX_COMMENTS: str = "dzinza_comments"
    
    # MongoDB Analytics Configuration
    MONGODB_ANALYTICS_ENABLED: bool = True
    MONGODB_URL_ANALYTICS: str = (
        "mongodb://mongodb:27017/dzinza_search_analytics"
    )
    MONGODB_DATABASE_NAME_ANALYTICS: str = "dzinza_search_analytics"
    
    # JWT Configuration
    JWT_SECRET: str = "your-secret-key-change-this-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_AUDIENCE: str = "dzinza-app"
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        # Read JWT secret from file if specified
        jwt_secret_file = os.getenv('JWT_SECRET_FILE')
        if jwt_secret_file and os.path.exists(jwt_secret_file):
            try:
                with open(jwt_secret_file, 'r') as f:
                    self.JWT_SECRET = f.read().strip()
            except Exception as e:
                print(f"Warning: Could not read JWT secret file: {e}")
    
    # Observability
    ENABLE_METRICS: bool = True
    ENABLE_TRACING: bool = False
    
    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=True,
        extra='ignore'
    )
    
    @property
    def CORS_ORIGINS(self) -> List[str]:
        """Parse CORS origins from environment variable or return default."""
        cors_origins = os.getenv(
            'CORS_ORIGINS',
            'http://localhost:3000,http://localhost:8080'
        )
        if isinstance(cors_origins, str):
            return [origin.strip() for origin in cors_origins.split(',')]
        return cors_origins


# Global settings instance
settings = Settings()
