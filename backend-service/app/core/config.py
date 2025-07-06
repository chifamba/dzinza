from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List, Optional, Dict, Any
from pydantic import AnyHttpUrl, model_validator, BaseModel
from functools import lru_cache

class ServiceURLMap(BaseModel):
    auth_service: AnyHttpUrl = "http://localhost:3002/api/v1" # Example default, will be overridden by env
    genealogy_service: AnyHttpUrl = "http://localhost:3004/api/v1"
    search_service: AnyHttpUrl = "http://localhost:3003/api/v1"
    storage_service: AnyHttpUrl = "http://localhost:3005/api/v1"
    # Add other services if any

class Settings(BaseSettings):
    PROJECT_NAME: str = "API Gateway (Backend Service)"
    PROJECT_VERSION: str = "0.1.0"
    DEBUG: bool = False

    # URLs for downstream services (scheme, host, port only)
    # These can be set via environment variables, e.g., AUTH_SERVICE_BASE_URL
    AUTH_SERVICE_BASE_URL: AnyHttpUrl = "http://auth-service:8000" # No longer include /api/v1
    GENEALOGY_SERVICE_BASE_URL: AnyHttpUrl = "http://genealogy-service:8000"
    SEARCH_SERVICE_BASE_URL: AnyHttpUrl = "http://search-service:8000" 
    STORAGE_SERVICE_BASE_URL: AnyHttpUrl = "http://storage-service:8000"

    # This mapping can be used by the proxy to determine target URLs based on path prefixes
    # Keys are path prefixes (e.g., "auth"), values will be the base URLs above.
    SERVICE_BASE_URLS_BY_PREFIX: Dict[str, str] = {} # Populated by validator, stores string version of URL

    # JWT Settings (if gateway validates tokens directly)
    JWT_SECRET_FILE: Optional[str] = None
    JWT_SECRET: Optional[str] = "fallback_gateway_jwt_secret_to_be_replaced"
    JWT_ALGORITHM: str = "HS256"
    JWT_AUDIENCE: Optional[str] = "dzinza-app" # Audience for tokens it validates
    JWT_ISSUER: Optional[str] = "dzinza-auth-service" # Example issuer to validate

    # Public key if using asymmetric algorithms (RS256 etc.)
    # JWT_PUBLIC_KEY_FILE: Optional[str] = None
    # JWT_PUBLIC_KEY: Optional[str] = None

    # Rate Limiting (example settings, if using a library like slowapi)
    ENABLE_RATE_LIMITING: bool = True
    RATE_LIMIT_DEFAULT: str = "100/minute"
    RATE_LIMIT_AUTH_ENDPOINTS: str = "10/minute" # Stricter for login/register

    # API settings
    API_V1_STR: str = "/api" # Path prefix for this gateway's own API endpoints (if any, like health)
                               # Note: The main proxying might happen at root "/" or a different prefix
    ALLOWED_ORIGINS: List[str] = ["*"] # Adjust in production

    # Timeout for requests to downstream services (in seconds)
    SERVICE_TIMEOUT_SECONDS: int = 15

    # OpenTelemetry settings
    ENABLE_TRACING: bool = False
    OTEL_EXPORTER_OTLP_ENDPOINT: Optional[str] = None
    OTEL_SERVICE_NAME: str = "api-gateway-service"

    SHARED_CONFIG_PATH: Optional[str] = "/etc/shared-config/backend.yaml"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding='utf-8', extra='ignore')

    def _read_secret_file(self, file_path: Optional[str]) -> Optional[str]:
        if file_path:
            try:
                with open(file_path, 'r') as f:
                    return f.read().strip()
            except IOError:
                pass
        return None

    @property
    def ASSEMBLED_JWT_SECRET(self) -> Optional[str]:
        return self._read_secret_file(self.JWT_SECRET_FILE) or self.JWT_SECRET

    # @property
    # def ASSEMBLED_JWT_PUBLIC_KEY(self) -> Optional[str]:
    #     return self._read_secret_file(self.JWT_PUBLIC_KEY_FILE) or self.JWT_PUBLIC_KEY

    @model_validator(mode='after')
    def build_service_map(cls, values: 'Settings') -> 'Settings':
        # This map helps the proxy route requests based on URL path prefixes
        # The keys are path prefixes that the gateway will look for.
        # Example: /api/v1/auth/* -> auth_service
        #          /api/v1/genealogy/* -> genealogy_service
        # The exact prefixes depend on how the Node.js gateway routes.
        # For now, using a simple mapping. This needs to align with actual routes.

        # Assuming the gateway itself is accessed at root, and downstream services have prefixes
        # like /auth, /genealogy etc., after the gateway's own potential prefix (API_V1_STR).
        # Let's assume the Node gateway proxies paths like:
        # /auth -> auth-service
        # /genealogy -> genealogy-service
        # /storage -> storage-service
        # /search -> search-service
        # /metrics, /admin, /docs are handled by gateway or specific services.

        # This mapping might be more dynamic or loaded from a config file in a real scenario.
        # The keys are the first path segment that identifies the downstream service.
        # Values are the base URLs (scheme://host:port) of the target services.
        service_base_map = {
            "auth": values.AUTH_SERVICE_BASE_URL,
            "users": values.AUTH_SERVICE_BASE_URL, # /users routes to auth service
            "genealogy": values.GENEALOGY_SERVICE_BASE_URL, # General prefix for genealogy
            "family-trees": values.GENEALOGY_SERVICE_BASE_URL,
            "persons": values.GENEALOGY_SERVICE_BASE_URL,
            "relationships": values.GENEALOGY_SERVICE_BASE_URL,
            "events": values.GENEALOGY_SERVICE_BASE_URL,
            "notifications": values.GENEALOGY_SERVICE_BASE_URL, # Notifications are part of genealogy
            "merge-suggestions": values.GENEALOGY_SERVICE_BASE_URL,
            "person-history": values.GENEALOGY_SERVICE_BASE_URL, # Person history part of genealogy
            "search": values.SEARCH_SERVICE_BASE_URL,
            "storage": values.STORAGE_SERVICE_BASE_URL,
            "files": values.STORAGE_SERVICE_BASE_URL, # /files routes to storage service
        }
        # Ensure URLs are stored as strings for httpx compatibility and simplicity in proxy.py
        values.SERVICE_BASE_URLS_BY_PREFIX = {k: str(v).rstrip('/') for k, v in service_base_map.items()}
        return values


@lru_cache()
def get_settings() -> Settings:
    return Settings()

settings = get_settings()
