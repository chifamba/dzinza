from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

class Settings(BaseSettings):
    PROJECT_NAME: str = "Dzinza Auth Service"
    PROJECT_VERSION: str = "1.0.0"
    DEBUG: bool = False

    # Database (PostgreSQL)
    DB_HOST: str = "localhost"
    DB_PORT: int = 5432
    DB_USER: str = "dzinza_user"
    DB_PASSWORD_FILE: Optional[str] = None # Path to secret file
    DB_PASSWORD: Optional[str] = None # Direct password (fallback or for non-Docker setups)
    DB_NAME: str = "dzinza_db"
    DATABASE_URL: Optional[str] = None # Will be constructed

    # Redis
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_PASSWORD_FILE: Optional[str] = None # Path to secret file
    REDIS_PASSWORD: Optional[str] = None # Direct password
    REDIS_DB: int = 0

    # JWT
    JWT_SECRET_FILE: Optional[str] = None # Path to secret file
    JWT_SECRET: Optional[str] = "fallback_jwt_secret_please_change" # Direct secret
    JWT_REFRESH_SECRET_FILE: Optional[str] = None
    JWT_REFRESH_SECRET: Optional[str] = "fallback_jwt_refresh_secret_please_change"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    JWT_ALGORITHM: str = "HS256"
    JWT_ISSUER: str = "dzinza-auth"
    JWT_AUDIENCE: str = "dzinza-app"

    # Password Hashing
    BCRYPT_ROUNDS: int = 12

    # Email
    SMTP_HOST: Optional[str] = None
    SMTP_PORT: Optional[int] = 587
    SMTP_USER: Optional[str] = None
    SMTP_PASS_FILE: Optional[str] = None
    SMTP_PASS: Optional[str] = None
    SMTP_TLS: bool = True # Use True for STARTTLS on port 587
    FROM_EMAIL: str = "noreply@dzinza.com"
    FROM_NAME: str = "Dzinza Platform"
    FRONTEND_URL: str = "http://localhost:3000"

    # CORS
    ALLOWED_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:8080"  # Added for frontend dev server
    ] # Frontend dev ports

    # OpenTelemetry
    ENABLE_TRACING: bool = False
    OTEL_SERVICE_NAME: str = "auth-service"
    JAEGER_ENDPOINT: str = "http://localhost:4318/v1/traces"

    # Account Security
    MAX_LOGIN_ATTEMPTS: int = 5
    ACCOUNT_LOCKOUT_MINUTES: int = 15
    PASSWORD_RESET_EXPIRE_MINUTES: int = 60
    EMAIL_VERIFICATION_EXPIRE_HOURS: int = 24

    # Google OAuth
    GOOGLE_CLIENT_ID_FILE: Optional[str] = None
    GOOGLE_CLIENT_ID: Optional[str] = None
    GOOGLE_CLIENT_SECRET_FILE: Optional[str] = None
    GOOGLE_CLIENT_SECRET: Optional[str] = None
    GOOGLE_CALLBACK_URL: Optional[str] = "http://localhost:8000/api/v1/auth/google/callback" # Default for Python service

    # This model_config attribute replaces the Config class in Pydantic V2
    model_config = SettingsConfigDict(
        env_file=".env",          # Load .env file if present
        env_file_encoding="utf-8",
        extra="ignore"            # Ignore extra fields from .env
    )

    def get_secret(self, file_path_attr: str, direct_attr: str) -> str:
        file_path = getattr(self, file_path_attr, None)
        if file_path:
            try:
                with open(file_path, 'r') as f:
                    return f.read().strip()
            except IOError:
                # Fallback to direct attribute if file not found or not readable
                pass

        direct_value = getattr(self, direct_attr, None)
        if direct_value is None:
            # This is a critical error if neither file nor direct value is available for essential secrets
            # For JWT_SECRET and REFRESH_TOKEN_SECRET, we have fallbacks defined in the model.
            # For DB_PASSWORD etc., if it's truly required and not found, the app might fail later.
            # Consider raising an error here or logging a severe warning for essential secrets.
            if file_path_attr in ["DB_PASSWORD_FILE", "REDIS_PASSWORD_FILE", "SMTP_PASS_FILE"]: # Add other critical secrets
                 raise ValueError(f"Secret for {direct_attr} not found in file {file_path} or as direct env var.")
        return direct_value if direct_value is not None else ""


    @property
    def ASSEMBLED_DATABASE_URL(self) -> str:
        if self.DATABASE_URL:
            return self.DATABASE_URL

        db_password = self.get_secret("DB_PASSWORD_FILE", "DB_PASSWORD")
        if not db_password: # Should have been caught by get_secret for critical ones
            raise ValueError("Database password is not configured.")

        return f"postgresql+psycopg2://{self.DB_USER}:{db_password}@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"

    @property
    def ASSEMBLED_JWT_SECRET(self) -> str:
        return self.get_secret("JWT_SECRET_FILE", "JWT_SECRET")

    @property
    def ASSEMBLED_JWT_REFRESH_SECRET(self) -> str:
        return self.get_secret("JWT_REFRESH_SECRET_FILE", "JWT_REFRESH_SECRET")

    @property
    def ASSEMBLED_REDIS_PASSWORD(self) -> Optional[str]:
        # Redis password can be optional
        password = self.get_secret("REDIS_PASSWORD_FILE", "REDIS_PASSWORD")
        return password if password else None

    @property
    def ASSEMBLED_SMTP_PASS(self) -> Optional[str]:
        password = self.get_secret("SMTP_PASS_FILE", "SMTP_PASS")
        return password if password else None

    @property
    def ASSEMBLED_GOOGLE_CLIENT_ID(self) -> Optional[str]:
        cid = self.get_secret("GOOGLE_CLIENT_ID_FILE", "GOOGLE_CLIENT_ID")
        return cid if cid else None

    @property
    def ASSEMBLED_GOOGLE_CLIENT_SECRET(self) -> Optional[str]:
        csecret = self.get_secret("GOOGLE_CLIENT_SECRET_FILE", "GOOGLE_CLIENT_SECRET")
        return csecret if csecret else None


settings = Settings()
