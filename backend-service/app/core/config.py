import os
import threading
import time
from functools import lru_cache
from typing import Dict, List, Optional

from pydantic import AnyHttpUrl, BaseModel, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from watchdog.events import FileSystemEventHandler
from watchdog.observers import Observer

class ServiceURLMap(BaseModel):
    auth_service: AnyHttpUrl = "http://localhost:3002/api/v1"
    genealogy_service: AnyHttpUrl = "http://localhost:3004/api/v1"
    search_service: AnyHttpUrl = "http://localhost:3003/api/v1"
    storage_service: AnyHttpUrl = "http://localhost:3005/api/v1"

class Settings(BaseSettings):
    PROJECT_NAME: str = "API Gateway (Backend Service)"
    PROJECT_VERSION: str = "0.1.0"
    DEBUG: bool = False

    AUTH_SERVICE_BASE_URL: Optional[AnyHttpUrl] = None
    GENEALOGY_SERVICE_BASE_URL: Optional[AnyHttpUrl] = None
    SEARCH_SERVICE_BASE_URL: Optional[AnyHttpUrl] = None
    STORAGE_SERVICE_BASE_URL: Optional[AnyHttpUrl] = None

    SERVICE_BASE_URLS_BY_PREFIX: Dict[str, str] = {}

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
    API_V1_STR: str = "/api/v1" # Path prefix for this gateway's own API endpoints (if any, like health)
                               # Note: The main proxying might happen at root "/" or a different prefix
    ALLOWED_ORIGINS: List[str] = ["*"] # Adjust in production

    # Timeout for requests to downstream services (in seconds)
    SERVICE_TIMEOUT_SECONDS: int = 15

    # OpenTelemetry settings
    ENABLE_TRACING: bool = False
    OTEL_EXPORTER_OTLP_ENDPOINT: Optional[str] = None
    OTEL_SERVICE_NAME: str = "api-gateway-service"

    SHARED_CONFIG_PATH: Optional[str] = "/etc/shared-config/backend.yaml"
    SERVICES_CONFIG_PATH: str = "config/services.conf"

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

    def load_service_urls_from_file(self, file_path: str) -> Dict[str, str]:
        urls = {}
        try:
            with open(file_path, 'r') as f:
                for line in f:
                    if '=' in line:
                        key, value = line.strip().split('=', 1)
                        urls[key] = value
        except IOError:
            pass  # Or log a warning
        return urls

    @model_validator(mode='after')
    def build_service_map(cls, values: 'Settings') -> 'Settings':
        service_urls = values.load_service_urls_from_file(values.SERVICES_CONFIG_PATH)

        values.AUTH_SERVICE_BASE_URL = service_urls.get("AUTH_SERVICE_URL")
        values.GENEALOGY_SERVICE_BASE_URL = service_urls.get("GENEALOGY_SERVICE_URL")
        values.SEARCH_SERVICE_BASE_URL = service_urls.get("SEARCH_SERVICE_URL")
        values.STORAGE_SERVICE_BASE_URL = service_urls.get("STORAGE_SERVICE_URL")

        service_base_map = {
            "auth": values.AUTH_SERVICE_BASE_URL,
            "users": values.AUTH_SERVICE_BASE_URL,
            "genealogy": values.GENEALOGY_SERVICE_BASE_URL,
            "family-trees": values.GENEALOGY_SERVICE_BASE_URL,
            "persons": values.GENEALOGY_SERVICE_BASE_URL,
            "relationships": values.GENEALOGY_SERVICE_BASE_URL,
            "events": values.GENEALOGY_SERVICE_BASE_URL,
            "notifications": values.GENEALOGY_SERVICE_BASE_URL,
            "merge-suggestions": values.GENEALOGY_SERVICE_BASE_URL,
            "person-history": values.GENEALOGY_SERVICE_BASE_URL,
            "search": values.SEARCH_SERVICE_BASE_URL,
            "storage": values.STORAGE_SERVICE_BASE_URL,
            "files": values.STORAGE_SERVICE_BASE_URL,
        }
        values.SERVICE_BASE_URLS_BY_PREFIX = {k: str(v).rstrip('/') for k, v in service_base_map.items() if v}
        return values


@lru_cache()
def get_settings() -> Settings:
    return Settings()

settings = get_settings()

class ConfigChangeHandler(FileSystemEventHandler):
    def __init__(self, settings_instance):
        self.settings = settings_instance
        self.last_reload_time = 0

    def on_modified(self, event):
        if event.src_path.endswith(os.path.basename(self.settings.SERVICES_CONFIG_PATH)):
            current_time = time.time()
            if current_time - self.last_reload_time > 1:  # Debounce
                print(f"Detected change in {event.src_path}. Reloading configuration.")
                self.settings.build_service_map(self.settings)
                self.last_reload_time = current_time

def start_config_watcher(settings_instance: Settings):
    path = os.path.dirname(settings_instance.SERVICES_CONFIG_PATH)
    event_handler = ConfigChangeHandler(settings_instance)
    observer = Observer()
    observer.schedule(event_handler, path, recursive=False)
    observer.start()
    print(f"Started watching for changes in {path}")

    # Keep the observer thread running
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        observer.stop()
    observer.join()

# It's better to start the watcher in the application's startup event
def setup_config_watcher(settings_instance: Settings):
    watcher_thread = threading.Thread(target=start_config_watcher, args=(settings_instance,), daemon=True)
    watcher_thread.start()
