from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import PostgresDsn, RedisDsn, AnyHttpUrl, EmailStr
from typing import List, Optional

class Settings(BaseSettings):
    PROJECT_NAME: str = "Dzinza Auth Service"
    API_V1_STR: str = "/api/v1"
    ENVIRONMENT: str = "development" # development, staging, production

    # Database
    POSTGRES_SERVER: str
    POSTGRES_USER: str
    POSTGRES_PASSWORD: str
    POSTGRES_DB: str
    DATABASE_URI: Optional[PostgresDsn] = None

    # Redis
    REDIS_HOST: str
    REDIS_PORT: int = 6379
    REDIS_PASSWORD: Optional[str] = None
    REDIS_DB: int = 0
    REDIS_URI: Optional[RedisDsn] = None

    # JWT
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    ALGORITHM: str = "HS256"
    JWT_SECRET_KEY: str # openssl rand -hex 32
    JWT_REFRESH_SECRET_KEY: str # openssl rand -hex 32

    # Rate Limiting (requests per minute)
    RATE_LIMIT_GUEST_RPM: int = 100
    RATE_LIMIT_USER_RPM: int = 200
    RATE_LIMIT_LOGIN_RPM: int = 10 # Per 15 minutes for login attempts
    RATE_LIMIT_FORGOT_PASSWORD_RPM: int = 5 # Per 15 minutes for forgot password

    # CORS
    CORS_ORIGINS: List[AnyHttpUrl] = [] # Example: ["http://localhost:3000", "http://localhost:5173"]

    # Email settings (for password reset, verification etc.)
    SMTP_HOST: Optional[str] = None
    SMTP_PORT: Optional[int] = None
    SMTP_USER: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    EMAILS_FROM_EMAIL: Optional[EmailStr] = None
    EMAILS_FROM_NAME: Optional[str] = None

    # Social Auth (placeholders, expand as needed)
    GOOGLE_CLIENT_ID: Optional[str] = None
    GOOGLE_CLIENT_SECRET: Optional[str] = None
    GOOGLE_REDIRECT_URI: Optional[AnyHttpUrl] = None

    FACEBOOK_CLIENT_ID: Optional[str] = None
    FACEBOOK_CLIENT_SECRET: Optional[str] = None
    FACEBOOK_REDIRECT_URI: Optional[AnyHttpUrl] = None

    # Observability
    ENABLE_TRACING: bool = False
    JAEGER_ENDPOINT: str = "http://localhost:4318/v1/traces" # OTLP HTTP
    OTEL_SERVICE_NAME: str = "auth-service-py"

    # MFA
    MFA_OTP_ISSUER_NAME: str = "DzinzaAuth"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    def __init__(self, **values):
        super().__init__(**values)
        if not self.DATABASE_URI and self.POSTGRES_SERVER:
            self.DATABASE_URI = PostgresDsn.build(
                scheme="postgresql+asyncpg",
                username=self.POSTGRES_USER,
                password=self.POSTGRES_PASSWORD,
                host=self.POSTGRES_SERVER,
                path=f"/{self.POSTGRES_DB or ''}",
            )
        if not self.REDIS_URI and self.REDIS_HOST:
            password_part = f":{self.REDIS_PASSWORD}" if self.REDIS_PASSWORD else ""
            self.REDIS_URI = RedisDsn.build(
                scheme="redis",
                host=self.REDIS_HOST,
                port=str(self.REDIS_PORT),
                password=self.REDIS_PASSWORD,
                path=f"/{self.REDIS_DB or 0}",
            )


settings = Settings()
