from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import model_validator, Field
from typing import List, Optional
from functools import lru_cache

class Settings(BaseSettings):
    PROJECT_NAME: str = "Genealogy Service"
    PROJECT_VERSION: str = "0.1.0"
    DEBUG: bool = False

    # MongoDB settings
    MONGODB_URL: str = "mongodb://localhost:27017"
    MONGODB_DATABASE_NAME: str = "dzinza_genealogy" # Or from shared config
    MONGODB_PASSWORD_FILE: Optional[str] = None # Path to MongoDB password file
    
    # MongoDB Connection Pool settings
    MONGODB_MIN_POOL_SIZE: int = Field(default=10, description="Minimum connections in the pool")
    MONGODB_MAX_POOL_SIZE: int = Field(default=100, description="Maximum connections in the pool")
    MONGODB_MAX_IDLE_TIME_MS: int = Field(default=30000, description="Max idle time for connections (ms)")
    MONGODB_CONNECT_TIMEOUT_MS: int = Field(default=10000, description="Connection timeout (ms)")
    MONGODB_SERVER_SELECTION_TIMEOUT_MS: int = Field(default=30000, description="Server selection timeout (ms)")
    MONGODB_SOCKET_TIMEOUT_MS: int = Field(default=20000, description="Socket timeout (ms)")
    MONGODB_WAIT_QUEUE_TIMEOUT_MS: int = Field(default=10000, description="Wait queue timeout (ms)")
    MONGODB_HEARTBEAT_FREQUENCY_MS: int = Field(default=10000, description="Heartbeat frequency (ms)")

    # Redis settings (for Celery and potentially caching)
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_PASSWORD_FILE: Optional[str] = None # Path to Redis password file
    REDIS_PASSWORD: Optional[str] = None # Allow direct password or from file

    # Celery settings - will be derived from Redis settings
    CELERY_BROKER_URL: Optional[str] = None
    CELERY_RESULT_BACKEND: Optional[str] = None

    # API settings
    API_V1_STR: str = "/v1"
    ALLOWED_ORIGINS: List[str] = ["*"] # Adjust in production

    # JWT Secret for internal validation if needed (prefer gateway validation)
    # SECRET_KEY: str = "your-secret-key" # Load from Docker secret or env
    # ALGORITHM: str = "HS256"
    # ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # OpenTelemetry settings (optional)
    ENABLE_TRACING: bool = False
    OTEL_EXPORTER_OTLP_ENDPOINT: Optional[str] = None # e.g., http://jaeger:4318/v1/traces
    OTEL_SERVICE_NAME: str = "genealogy-service"

    # Shared config path (if mounted)
    SHARED_CONFIG_PATH: Optional[str] = "/etc/shared-config/genealogy.yaml" # Example

    # GEDCOM settings
    GEDCOM_MAX_FILE_SIZE_MB: int = 10
    GEDCOM_UPLOAD_DIR: str = "/tmp/gedcom_uploads" # Ensure this is writable by the app user

    # Ports for service itself (if not managed by compose port mapping only)
    # PORT: int = 8002 # Example, if needed directly by uvicorn within container

    # Duplicate Detection Settings
    DUPLICATE_DETECTION_THRESHOLD: float = Field(default=0.75, ge=0.5, le=1.0, description="Similarity threshold for creating merge suggestions.")


    model_config = SettingsConfigDict(env_file=".env", env_file_encoding='utf-8', extra='ignore')

    @model_validator(mode='after')
    def build_derived_urls(cls, values: 'Settings') -> 'Settings':
        # Construct MongoDB URL with credentials if password file is provided
        # The MONGODB_URL from env might already include user, or it might be just scheme+host
        # This logic assumes MONGODB_URL is like "mongodb://user@host:port" and we might add password
        # Or, if MONGODB_URL is "mongodb://host:port" and user is implicit or also from env.
        # For docker-compose, we set MONGODB_URL=mongodb://${DB_USER:-dzinza_user}@mongodb:27017

        mongo_password = None
        if values.MONGODB_PASSWORD_FILE:
            try:
                with open(values.MONGODB_PASSWORD_FILE, 'r') as f:
                    mongo_password = f.read().strip()
            except IOError:
                # Handle error or log: password file not found / not readable
                pass # Keep mongo_password as None

        if mongo_password and values.MONGODB_URL and "@" in values.MONGODB_URL:
            # If URL already has user, inject password
            # Example: mongodb://user@host -> mongodb://user:password@host
            parts = values.MONGODB_URL.split('@')
            if len(parts) == 2 and ":" not in parts[0]: # ensure 'user' part doesn't already have a password
                scheme_user = parts[0] # e.g. mongodb://user
                host_db = parts[1]     # e.g. mongodb:27017
                values.MONGODB_URL = f"{scheme_user}:{mongo_password}@{host_db}"

        # Construct Celery URLs using Redis settings
        redis_password = values.REDIS_PASSWORD # Prioritize direct password
        if not redis_password and values.REDIS_PASSWORD_FILE:
            try:
                with open(values.REDIS_PASSWORD_FILE, 'r') as f:
                    redis_password = f.read().strip()
            except IOError:
                # Handle error or log: password file not found
                pass # Keep redis_password as None

        redis_auth = f":{redis_password}@" if redis_password else ""

        if values.CELERY_BROKER_URL is None:
            values.CELERY_BROKER_URL = f"redis://{redis_auth}{values.REDIS_HOST}:{values.REDIS_PORT}/0"

        if values.CELERY_RESULT_BACKEND is None:
            values.CELERY_RESULT_BACKEND = f"redis://{redis_auth}{values.REDIS_HOST}:{values.REDIS_PORT}/1"

        return values

@lru_cache()
def get_settings() -> Settings:
    return Settings()

settings = get_settings()
