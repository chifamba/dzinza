from pydantic_settings import BaseSettings
import os

class Settings(BaseSettings):
    """Configuration settings for the auth service."""

    # Database settings
    DB_USER: str = os.getenv("DB_USER", "dzinza_user")
    DB_PASSWORD_FILE: str = "/run/secrets/db_password"
    DB_HOST: str = os.getenv("DB_HOST", "postgres")
    DB_PORT: int = int(os.getenv("DB_PORT", 5432))
    DB_NAME: str = os.getenv("DB_NAME", "dzinza_db")

    @property
    def db_password(self) -> str:
        if os.path.exists(self.DB_PASSWORD_FILE):
            with open(self.DB_PASSWORD_FILE, "r") as f:
                return f.read().strip()
        else:
            # Fallback for local development/testing when not in Docker
            local_path = os.path.join(os.path.dirname(__file__), "../../secrets/db_password.txt")
            with open(local_path, "r") as f:
                return f.read().strip()

    @property
    def database_url(self) -> str:
        """Constructs the database URL from settings."""
        return f"postgresql+psycopg2://{self.DB_USER}:{self.db_password}@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"

    # JWT settings
    JWT_SECRET_FILE: str = "/run/secrets/jwt_secret"
    JWT_REFRESH_SECRET_FILE: str = "/run/secrets/jwt_refresh_secret"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    @property
    def jwt_secret(self) -> str:
        if os.path.exists(self.JWT_SECRET_FILE):
            with open(self.JWT_SECRET_FILE, "r") as f:
                return f.read().strip()
        else:
            local_path = os.path.join(os.path.dirname(__file__), "../../secrets/jwt_secret.txt")
            with open(local_path, "r") as f:
                return f.read().strip()

    @property
    def jwt_refresh_secret(self) -> str:
        if os.path.exists(self.JWT_REFRESH_SECRET_FILE):
            with open(self.JWT_REFRESH_SECRET_FILE, "r") as f:
                return f.read().strip()
        else:
            local_path = os.path.join(os.path.dirname(__file__), "../../secrets/jwt_refresh_secret.txt")
            with open(local_path, "r") as f:
                return f.read().strip()


settings = Settings()
