from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import AnyHttpUrl
from typing import List, Optional

class ServiceURLSettings(BaseModel):
    AUTH_SERVICE_URL: AnyHttpUrl = "http://auth-service-py:3002" # Default for Docker compose
    GENEALOGY_SERVICE_URL: AnyHttpUrl = "http://genealogy-service-py:3004"
    STORAGE_SERVICE_URL: AnyHttpUrl = "http://storage-service-py:3005"
    SEARCH_SERVICE_URL: AnyHttpUrl = "http://search-service-py:3003"
    # Add other services if any

class Settings(BaseSettings):
    PROJECT_NAME: str = "Dzinza API Gateway"
    API_V1_PREFIX: str = "/api" # The prefix this gateway itself serves under
    ENVIRONMENT: str = "development"

    # Downstream service URLs
    SERVICES: ServiceURLSettings = ServiceURLSettings()

    # JWT settings (if gateway validates tokens before proxying)
    # These should match the JWT_SECRET_KEY used by the auth-service for access tokens.
    # Alternatively, the gateway could pass tokens through and let services validate,
    # or use an introspection endpoint on the auth-service.
    # For simplicity, if validating at gateway, it needs the secret.
    AUTH_SERVICE_JWT_SECRET_KEY: Optional[str] = None # Set if gateway validates
    ALGORITHM: Optional[str] = "HS256" # Set if gateway validates

    # CORS (Gateway is primary point for CORS handling)
    CORS_ORIGINS: List[AnyHttpUrl] = [
        "http://localhost:3000", # Example frontend dev
        "http://localhost:5173", # Another frontend dev port
        "http://localhost:5174",
        "http://localhost:5175",
        "http.localhost:5176"
    ] # Populated from env var usually
    CORS_ALLOW_CREDENTIALS: bool = True
    CORS_ALLOW_METHODS: List[str] = ["*"]
    CORS_ALLOW_HEADERS: List[str] = ["*"]

    # Observability
    ENABLE_TRACING: bool = False
    JAEGER_ENDPOINT: str = "http://localhost:4318/v1/traces"
    OTEL_SERVICE_NAME: str = "api-gateway-py"

    # Rate Limiting (General limit for the gateway)
    API_RATE_LIMIT_RPM: int = 500 # Requests per minute, example

    # Timeout for requests to downstream services (in seconds)
    SERVICE_REQUEST_TIMEOUT: float = 15.0

    model_config = SettingsConfigDict(env_file=".env", extra="ignore", case_sensitive=False, env_nested_delimiter='_')
    # Example for nested env vars: SERVICES_AUTH_SERVICE_URL=http://...

settings = Settings()
