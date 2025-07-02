from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List, Optional, Union, Dict, Any
from pydantic import model_validator, AnyHttpUrl
from functools import lru_cache

class Settings(BaseSettings):
    PROJECT_NAME: str = "Search Service"
    PROJECT_VERSION: str = "0.1.0"
    DEBUG: bool = False

    # Elasticsearch settings
    # Option 1: Single URL
    ELASTICSEARCH_URL: Optional[AnyHttpUrl] = "http://localhost:9200"

    # Option 2: Cloud ID (for Elastic Cloud)
    ELASTICSEARCH_CLOUD_ID: Optional[str] = None

    # Option 3: Individual components (host, port, scheme)
    ELASTICSEARCH_HOSTS: List[Union[str, Dict[str, Union[str, int]]]] = [{"host": "localhost", "port": 9200, "scheme": "http"}]

    # API Key/Auth for Elasticsearch (if secured)
    ELASTICSEARCH_API_KEY_ID_FILE: Optional[str] = None
    ELASTICSEARCH_API_KEY_FILE: Optional[str] = None
    ELASTICSEARCH_USERNAME_FILE: Optional[str] = None
    ELASTICSEARCH_PASSWORD_FILE: Optional[str] = None

    # Derived Elasticsearch client config (populated by model_validator)
    ELASTICSEARCH_CLIENT_CONFIG: Dict[str, Any] = {}

    # MongoDB settings (for search analytics, if used)
    MONGODB_ANALYTICS_ENABLED: bool = False # Control if analytics are stored
    MONGODB_URL_ANALYTICS: Optional[str] = "mongodb://localhost:27017" # Separate from main app DB if needed
    MONGODB_DATABASE_NAME_ANALYTICS: str = "dzinza_search_analytics"
    MONGODB_PASSWORD_FILE_ANALYTICS: Optional[str] = None # Path to password file for analytics DB

    # API settings
    API_V1_STR: str = "/api/v1"
    ALLOWED_ORIGINS: List[str] = ["*"] # Adjust in production

    # JWT Settings (if validating tokens locally)
    JWT_SECRET_FILE: Optional[str] = None
    JWT_SECRET: Optional[str] = "fallback_search_jwt_secret"
    JWT_ALGORITHM: str = "HS256"
    JWT_AUDIENCE: Optional[str] = "dzinza-app"

    # OpenTelemetry settings
    ENABLE_TRACING: bool = False
    OTEL_EXPORTER_OTLP_ENDPOINT: Optional[str] = None
    OTEL_SERVICE_NAME: str = "search-service"

    SHARED_CONFIG_PATH: Optional[str] = "/etc/shared-config/search.yaml"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding='utf-8', extra='ignore')

    def _read_secret_file(self, file_path: Optional[str]) -> Optional[str]:
        if file_path:
            try:
                with open(file_path, 'r') as f:
                    return f.read().strip()
            except IOError:
                # Log error or handle as needed
                pass
        return None

    @model_validator(mode='after')
    def build_elasticsearch_config(cls, values: 'Settings') -> 'Settings':
        config = {}
        if values.ELASTICSEARCH_CLOUD_ID:
            config["cloud_id"] = values.ELASTICSEARCH_CLOUD_ID
        elif values.ELASTICSEARCH_URL:
            config["hosts"] = [str(values.ELASTICSEARCH_URL)] # ES client expects list of hosts
        else: # Use ELASTICSEARCH_HOSTS if others are not set
            config["hosts"] = values.ELASTICSEARCH_HOSTS

        # Handle Auth for Elasticsearch
        api_key_id = values._read_secret_file(values.ELASTICSEARCH_API_KEY_ID_FILE)
        api_key = values._read_secret_file(values.ELASTICSEARCH_API_KEY_FILE)
        username = values._read_secret_file(values.ELASTICSEARCH_USERNAME_FILE)
        password = values._read_secret_file(values.ELASTICSEARCH_PASSWORD_FILE)

        if api_key_id and api_key:
            config["api_key"] = (api_key_id, api_key)
        elif username and password:
            config["basic_auth"] = (username, password)

        values.ELASTICSEARCH_CLIENT_CONFIG = config
        return values

    @property
    def ASSEMBLED_JWT_SECRET(self) -> Optional[str]:
        # Access attributes via self in a property
        return self._read_secret_file(self.JWT_SECRET_FILE) or self.JWT_SECRET

    @property
    def ASSEMBLED_MONGODB_URL_ANALYTICS(self) -> Optional[str]:
        if not self.MONGODB_ANALYTICS_ENABLED or not self.MONGODB_URL_ANALYTICS:
            return None

        base_url = self.MONGODB_URL_ANALYTICS
        password = self._read_secret_file(self.MONGODB_PASSWORD_FILE_ANALYTICS)

        # Basic assumption: if password, URL needs user@ part.
        # This might need more robust parsing/construction based on MONGODB_URL_ANALYTICS format.
        # Example: mongodb://user@host/db -> mongodb://user:password@host/db
        # For simplicity, if password exists, assume it can be prepended with 'user:pass@' if user is in URL.
        # This logic needs to be robust depending on expected MONGODB_URL_ANALYTICS format.
        # A common pattern is for MONGODB_URL_ANALYTICS to already contain the username.
        if password and "@" in base_url:
            parts = base_url.split("://")
            scheme = parts[0]
            rest = parts[1]
            auth_host_path = rest.split("@")
            if len(auth_host_path) == 2: # Format like user@host/db
                user = auth_host_path[0]
                host_path = auth_host_path[1]
                return f"{scheme}://{user}:{password}@{host_path}"
        return base_url # Return as is if no password or simple URL

@lru_cache()
def get_settings() -> Settings:
    return Settings()

settings = get_settings()
