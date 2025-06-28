from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import MongoDsn, AnyHttpUrl, DirectoryPath, PositiveInt
from typing import List, Optional, Union

class Settings(BaseSettings):
    PROJECT_NAME: str = "Dzinza Storage Service"
    API_V1_STR: str = "/api/v1"
    ENVIRONMENT: str = "development"

    # MongoDB for metadata
    MONGODB_URI: MongoDsn
    MONGODB_DATABASE_NAME: str = "dzinza_storage"

    # JWT settings (for validating tokens from auth-service)
    AUTH_SERVICE_JWT_SECRET_KEY: str # MUST match JWT_SECRET_KEY in auth-service
    ALGORITHM: str = "HS256"       # Must match auth-service algorithm

    # S3 Storage Configuration
    S3_ENDPOINT_URL: Optional[AnyHttpUrl] = None # For MinIO or other S3-compatible services
    S3_ACCESS_KEY_ID: Optional[str] = None
    S3_SECRET_ACCESS_KEY: Optional[str] = None
    S3_BUCKET_NAME: str = "dzinza-storage-bucket"
    S3_REGION_NAME: Optional[str] = "us-east-1" # Required for AWS S3 if not using endpoint_url for S3 actual
    S3_USE_SSL: bool = True
    S3_VERIFY_SSL: Optional[Union[bool, str]] = None # Path to CA bundle or False to disable (not recommended for prod)
    S3_PRESIGNED_URL_EXPIRY_SECONDS: int = 3600 # 1 hour for download links

    # Local Storage Configuration (alternative or for temporary files)
    LOCAL_STORAGE_PATH: DirectoryPath = "uploads" # Base path for local storage
    TEMP_UPLOAD_PATH: DirectoryPath = "/tmp/dzinza_uploads" # For temporary storage during processing

    # Image Processing
    IMAGE_MAX_SIZE_MB: PositiveInt = 10 # Max image upload size in MB
    IMAGE_THUMBNAIL_SIZE_PX: PositiveInt = 256 # e.g. 256x256
    IMAGE_ALLOWED_EXTENSIONS: List[str] = ["jpg", "jpeg", "png", "gif", "webp"]

    # File settings
    FILE_MAX_SIZE_MB: PositiveInt = 50 # Max general file upload size in MB (e.g. documents)

    # CORS
    CORS_ORIGINS: List[AnyHttpUrl] = []

    # Observability
    ENABLE_TRACING: bool = False
    JAEGER_ENDPOINT: str = "http://localhost:4318/v1/traces"
    OTEL_SERVICE_NAME: str = "storage-service-py"

    # Cleanup Service Schedule (example: cron string for APScheduler)
    CLEANUP_SCHEDULE_CRON: str = "0 3 * * *" # Run daily at 3 AM UTC
    TEMP_FILE_MAX_AGE_HOURS: PositiveInt = 24 # Max age for temp files before cleanup

    # Rate Limiting (example values)
    RATE_LIMIT_UPLOAD_RPM: int = 20 # Requests per minute for upload endpoints
    RATE_LIMIT_GENERAL_RPM: int = 100 # For other endpoints

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()
