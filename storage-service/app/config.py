from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional, List

class Settings(BaseSettings):
    PROJECT_NAME: str = "Dzinza Storage Service"
    PROJECT_VERSION: str = "1.0.0"
    DEBUG: bool = False
    PORT: int = 8000 # Internal port for Uvicorn

    # MongoDB (for file metadata)
    MONGODB_URI_FILE: Optional[str] = None # Path to secret file for full URI
    MONGODB_URI: Optional[str] = "mongodb://localhost:27017/dzinza_storage" # Direct URI (fallback or for non-Docker)
    # Alternatively, individual components if URI is constructed:
    MONGO_HOST: str = "localhost"
    MONGO_PORT: int = 27017
    MONGO_USER: Optional[str] = None
    MONGO_PASSWORD_FILE: Optional[str] = None
    MONGO_PASSWORD: Optional[str] = None
    MONGO_DB_NAME: str = "dzinza_storage"

    # AWS S3 Configuration
    AWS_ACCESS_KEY_ID_FILE: Optional[str] = None
    AWS_ACCESS_KEY_ID: Optional[str] = None
    AWS_SECRET_ACCESS_KEY_FILE: Optional[str] = None
    AWS_SECRET_ACCESS_KEY: Optional[str] = None
    AWS_REGION: str = "us-east-1"
    S3_BUCKET_NAME: str = "your-dzinza-storage-bucket"
    S3_ENDPOINT_URL: Optional[str] = None # For S3-compatible storage like MinIO
    S3_FORCE_PATH_STYLE: bool = False # For MinIO if needed
    S3_PRESIGNED_URL_EXPIRATION: int = 3600 # Seconds (1 hour)

    # File Upload Limits (from service perspective, multer limits are separate)
    MAX_FILE_SIZE_BYTES: int = 100 * 1024 * 1024  # 100MB
    # ALLOWED_MIME_TYPES: List[str] = ["image/jpeg", "image/png", "application/pdf", ...] # Can be defined here or elsewhere

    # Image Processing
    THUMBNAIL_SIZES: List[tuple[int, int]] = [(100, 100), (300, 300), (600, 600)] # (width, height)
    THUMBNAIL_DEFAULT_FORMAT: str = "JPEG"

    # CORS
    ALLOWED_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:5173", "http://localhost:5174"]

    # OpenTelemetry
    ENABLE_TRACING: bool = False
    OTEL_SERVICE_NAME: str = "storage-service-py"
    JAEGER_ENDPOINT: str = "http://localhost:4318/v1/traces"

    # Cleanup Service (if run within this service)
    CLEANUP_SCHEDULE_CRON: str = "0 2 * * *" # Default: 2 AM daily
    TEMP_FILE_LIFESPAN_HOURS: int = 24 # For temporary/incomplete uploads

    # JWT Settings (for validating tokens if done by this service itself)
    # These should match the settings used by the auth-service that issues the tokens.
    JWT_SECRET_FILE: Optional[str] = None
    JWT_SECRET: Optional[str] = "fallback_storage_jwt_secret_please_change_this_if_validating_locally" # Potentially from a shared config
    JWT_ALGORITHM: str = "HS256"
    JWT_AUDIENCE: Optional[str] = "dzinza-app" # Should match what auth-service sets as audience

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    def get_secret(self, file_path_attr: str, direct_attr: str) -> Optional[str]:
        file_path = getattr(self, file_path_attr, None)
        if file_path:
            try:
                with open(file_path, 'r') as f:
                    return f.read().strip()
            except IOError:
                pass # Fallback to direct attribute

        direct_value = getattr(self, direct_attr, None)
        # For critical secrets like AWS keys, you might want to raise an error if neither is found.
        # if direct_value is None and file_path_attr in ["AWS_ACCESS_KEY_ID_FILE", "AWS_SECRET_ACCESS_KEY_FILE"]:
        #     raise ValueError(f"Secret for {direct_attr} not found.")
        return direct_value

    @property
    def ASSEMBLED_MONGODB_URI(self) -> str:
        # Priority to MONGODB_URI_FILE, then MONGODB_URI, then constructed
        if self.MONGODB_URI_FILE:
            try:
                with open(self.MONGODB_URI_FILE, 'r') as f:
                    return f.read().strip()
            except IOError:
                pass # Fallback
        if self.MONGODB_URI:
            return self.MONGODB_URI

        user = self.MONGO_USER
        password = self.get_secret("MONGO_PASSWORD_FILE", "MONGO_PASSWORD")

        if user and password:
            return f"mongodb://{user}:{password}@{self.MONGO_HOST}:{self.MONGO_PORT}/{self.MONGO_DB_NAME}?authSource=admin"
        elif user: # Password might be empty for some local setups, though not recommended
             return f"mongodb://{user}@{self.MONGO_HOST}:{self.MONGO_PORT}/{self.MONGO_DB_NAME}?authSource=admin"
        else: # No auth
            return f"mongodb://{self.MONGO_HOST}:{self.MONGO_PORT}/{self.MONGO_DB_NAME}"

    @property
    def ASSEMBLED_AWS_ACCESS_KEY_ID(self) -> Optional[str]:
        return self.get_secret("AWS_ACCESS_KEY_ID_FILE", "AWS_ACCESS_KEY_ID")

    @property
    def ASSEMBLED_AWS_SECRET_ACCESS_KEY(self) -> Optional[str]:
        return self.get_secret("AWS_SECRET_ACCESS_KEY_FILE", "AWS_SECRET_ACCESS_KEY")

    @property
    def ASSEMBLED_JWT_SECRET(self) -> Optional[str]:
        # Prioritize JWT_SECRET_FILE, then JWT_SECRET env var.
        # The direct_attr "JWT_SECRET" in get_secret will fetch value from env if JWT_SECRET_FILE is not found or readable
        return self.get_secret("JWT_SECRET_FILE", "JWT_SECRET")

settings = Settings()
