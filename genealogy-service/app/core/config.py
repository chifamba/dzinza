from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import MongoDsn, RedisDsn, AnyHttpUrl
from typing import List, Optional

class Settings(BaseSettings):
    PROJECT_NAME: str = "Dzinza Genealogy Service"
    API_V1_STR: str = "/api/v1" # Assuming API prefix, adjust if service is mounted differently by gateway
    ENVIRONMENT: str = "development" # development, staging, production

    # MongoDB
    MONGODB_URI: MongoDsn
    MONGODB_DATABASE_NAME: str = "dzinza_genealogy" # Default, can be part of URI

    # Redis (for Celery message broker and results backend)
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_PASSWORD: Optional[str] = None
    REDIS_DB_CELERY: int = 1 # Use a different DB for Celery than auth-service if sharing Redis
    CELERY_BROKER_URL: Optional[RedisDsn] = None
    CELERY_RESULT_BACKEND: Optional[RedisDsn] = None

    # JWT settings (for validating tokens from auth-service)
    # These should match the JWT_SECRET_KEY used by the auth-service for access tokens
    # In a real microservices setup, this might be fetched from a config server or env var
    # Or, better, use asymmetric keys (RS256) where auth-service signs with private key
    # and this service verifies with public key.
    # For now, assume symmetric key matching auth-service's ACCESS_TOKEN secret.
    AUTH_SERVICE_JWT_SECRET_KEY: str # This MUST match JWT_SECRET_KEY in auth-service
    ALGORITHM: str = "HS256" # Must match auth-service algorithm

    # CORS (if service is accessed directly, often handled by gateway)
    CORS_ORIGINS: List[AnyHttpUrl] = []

    # Observability
    ENABLE_TRACING: bool = False
    JAEGER_ENDPOINT: str = "http://localhost:4318/v1/traces" # OTLP HTTP
    OTEL_SERVICE_NAME: str = "genealogy-service-py"

    # Auth Service URL (if this service needs to call auth-service, e.g., for token introspection)
    AUTH_SERVICE_BASE_URL: Optional[AnyHttpUrl] = None # e.g., http://auth-service-py:3002

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    def __init__(self, **values):
        super().__init__(**values)
        if not self.CELERY_BROKER_URL:
            self.CELERY_BROKER_URL = RedisDsn.build(
                scheme="redis",
                host=self.REDIS_HOST,
                port=int(self.REDIS_PORT),
                password=self.REDIS_PASSWORD,
                path=f"/{self.REDIS_DB_CELERY}",
            )
        if not self.CELERY_RESULT_BACKEND:
             self.CELERY_RESULT_BACKEND = RedisDsn.build(
                scheme="redis",
                host=self.REDIS_HOST,
                port=int(self.REDIS_PORT),
                password=self.REDIS_PASSWORD,
                path=f"/{self.REDIS_DB_CELERY + 1}", # Use a different DB for results if desired
            )

settings = Settings()
