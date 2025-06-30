# Environment Configuration Guide (Python Backend with Docker Compose)

## Overview

The Dzinza project's Python backend services are configured primarily through environment variables managed by Docker Compose, with sensitive values handled using Docker Secrets. Each Python service uses Pydantic-Settings to load its configuration.

## Configuration Structure

### 1. Docker Compose Environment (`.env` file at project root)
   - A single `.env` file at the root of the project is used by `docker-compose.yml` for variable substitution.
   - This file typically defines external ports, common user/database names (if not using secrets for everything), and global settings like `DEBUG` mode or `JAEGER_ENDPOINT`.
   - **Example `.env` content (for Docker Compose):**
     ```bash
     # Docker Compose specific variables
     COMPOSE_PROJECT_NAME=dzinza
     DB_PORT=54321 # Example: Map host port 54321 to container port 5432 for PostgreSQL
     REDIS_PORT=63790
     GATEWAY_PORT=3001 # External port for the API Gateway

     # Common settings that might be used by multiple services via Docker Compose env vars
     DEBUG=false
     DB_USER=dzinza_app_user
     DB_NAME=dzinza_platform_db
     MONGODB_GENEALOGY_DB=dzinza_genealogy_store
     # etc.
     ```
   - An `.env.example` file at the root serves as a template for this Docker Compose `.env` file.

### 2. Docker Secrets (`./secrets/` directory)
   - All sensitive information (database passwords, API keys, JWT secrets) are stored as individual files within the `./secrets/` directory (e.g., `./secrets/db_password.txt`, `./secrets/jwt_secret.txt`).
   - These files are mounted into the respective service containers by Docker Compose at runtime (typically under `/run/secrets/`).
   - Refer to `.secrets.baseline` for a list of required secret files.
   - **These secret files MUST NOT be committed to version control.**

### 3. Service-Level Configuration (Python Pydantic Settings)
   - Each Python microservice (e.g., `auth-service`, `genealogy-service`) has an `app/core/config.py` file defining a Pydantic `Settings` model.
   - This model declares all expected configuration parameters for the service, their types, and default values.
   - Pydantic-Settings loads values in the following order of precedence (highest first):
     1. Environment variables passed to the container (via `docker-compose.yml`).
     2. Values from a `.env` file located within the service's own root directory (e.g., `auth-service/.env`) - useful for local development overrides *outside* Docker.
     3. Default values defined in the `Settings` model itself.
   - For secrets, the `Settings` model typically defines variables like `DB_PASSWORD_FILE` which point to the path of the mounted Docker secret file (e.g., `/run/secrets/db_password`). The model then has logic (e.g., `@property` methods) to read the content of these files.

## Key Principles

1.  **Docker Compose for Orchestration:** `docker-compose.yml` defines the services, their build contexts, environment variables, and mounted secrets.
2.  **Environment Variables for Flexibility:** Most configuration is passed as environment variables to the containers, allowing for different settings per environment (dev, staging, prod) without code changes.
3.  **Docker Secrets for Security:** Sensitive data is handled exclusively through Docker secrets. Python services read these secrets from the mounted file paths.
4.  **Pydantic-Settings for Validation:** Each Python service validates its configuration at startup using its Pydantic `Settings` model, ensuring all required parameters are present and correctly typed.
5.  **Centralized Definition, Distributed Consumption:** While Docker Compose centralizes the *injection* of environment variables and secrets, each service's `config.py` is the source of truth for *what* configuration it expects.

## Configuration Examples (Illustrative from `docker-compose.yml` and Service `config.py`)

Refer to the `docker-compose.yml` file and each service's `app/core/config.py` for the most up-to-date and detailed configuration parameters.

### Example: `auth-service` Configuration

**In `docker-compose.yml` (for `auth_service_py`):**
```yaml
services:
  auth_service_py:
    environment:
      - DEBUG=${DEBUG:-false}
      - DB_HOST=postgres
      - DB_PORT=5432 # Internal port for PostgreSQL service
      - DB_USER=${DB_USER:-dzinza_user}
      - DB_NAME=${DB_NAME:-dzinza_db}
      - DB_PASSWORD_FILE=/run/secrets/db_password
      - REDIS_HOST=redis
      - REDIS_PORT=6379 # Internal port for Redis service
      - REDIS_PASSWORD_FILE=/run/secrets/redis_password
      - JWT_SECRET_FILE=/run/secrets/jwt_secret
      - JWT_REFRESH_SECRET_FILE=/run/secrets/jwt_refresh_secret
      - JWT_ALGORITHM=HS256
      - JWT_ISSUER=dzinza-auth-service
      - JWT_AUDIENCE=dzinza-app
      # ... other settings like SMTP, Google OAuth file paths ...
    secrets:
      - db_password
      - redis_password
      - jwt_secret
      - jwt_refresh_secret
      # ... other secrets ...
```

**In `auth-service/app/core/config.py` (Pydantic Settings model - simplified):**
```python
class Settings(BaseSettings):
    DEBUG: bool = False
    DB_HOST: str
    DB_PORT: int
    DB_USER: str
    DB_NAME: str
    DB_PASSWORD_FILE: Optional[str] = None
    # ...
    JWT_SECRET_FILE: Optional[str] = None
    # ...

    @property
    def ASSEMBLED_DATABASE_URL(self) -> str:
        # Logic to read DB_PASSWORD_FILE and construct URL
        # ...

    @property
    def ASSEMBLED_JWT_SECRET(self) -> str:
        # Logic to read JWT_SECRET_FILE
        # ...
```

### Example: `backend-service` (API Gateway) Configuration

**In `docker-compose.yml` (for `backend_service_py`):**
```yaml
services:
  backend_service_py:
    environment:
      - DEBUG=${DEBUG:-false}
      - AUTH_SERVICE_BASE_URL=http://auth_service_py:8000
      - GENEALOGY_SERVICE_BASE_URL=http://genealogy_service_py:8000
      # ... other downstream service base URLs ...
      - JWT_SECRET_FILE=/run/secrets/jwt_secret # If gateway validates tokens
      # ...
    secrets:
      - jwt_secret
```
**In `backend-service/app/core/config.py`:**
```python
class Settings(BaseSettings):
    DEBUG: bool = False
    AUTH_SERVICE_BASE_URL: AnyHttpUrl
    GENEALOGY_SERVICE_BASE_URL: AnyHttpUrl
    # ...
    SERVICE_BASE_URLS_BY_PREFIX: Dict[str, str] = {} # Populated by validator

    @model_validator(mode='after')
    def build_service_map(cls, values: 'Settings') -> 'Settings':
        # Populates SERVICE_BASE_URLS_BY_PREFIX using individual service base URLs
        # ...
```

## Setting Up a New Environment

1.  **Create Root `.env` File:** Copy `env.example` (at the project root) to `.env`. Customize variables like external ports or global debug flags for your Docker Compose environment.
2.  **Create Secret Files:** In the `./secrets/` directory, create plain text files for each secret listed in `docker-compose.yml` under the `secrets:` section and referenced by services. For example, create `./secrets/db_password.txt` and put the PostgreSQL password in it. **Do not commit these files.** Use `.secrets.baseline` as a checklist.
3.  **Service-Specific `.env` (Optional, for local dev without Docker):** If running a Python service locally (outside Docker, e.g., `uvicorn app.main:app --reload`), you can create a `.env` file in that service's root directory (e.g., `auth-service/.env`) to set its specific environment variables. Pydantic-Settings will load these.

## Best Practices for Python Services

1.  **Define all configurable parameters** in the service's `app/core/config.py` using a Pydantic `Settings` model. This provides type validation and clear defaults.
2.  **Prioritize environment variables** for configuration in containerized environments. Docker Compose is the primary way to set these.
3.  **Use Docker Secrets** for all sensitive data. The `Settings` model should expect a `_FILE` suffixed environment variable pointing to the secret's file path within the container (e.g., `DB_PASSWORD_FILE=/run/secrets/db_password`).
4.  **Construct connection strings** or complex configurations dynamically within the `Settings` model (e.g., using `@property` or `@model_validator`) from basic components and secret file contents.
5.  **Refer to `docker-compose.yml`** and each service's `config.py` for the definitive list of environment variables they expect or can use.

## Troubleshooting

1.  **Service Fails to Start Due to Missing Config:** Check the service logs. Pydantic-Settings will raise validation errors if required environment variables (that don't have defaults or can't be derived) are missing. Ensure they are set in `docker-compose.yml`.
2.  **Secret Not Found:** Verify the secret file exists in your local `./secrets/` directory, is correctly named, and the `secrets:` definition in `docker-compose.yml` correctly maps it. Also check that the `_FILE` environment variable in `docker-compose.yml` for the service correctly points to `/run/secrets/<secret_name>`.
3.  **Incorrect Service URLs (Gateway):** If the API Gateway cannot connect to downstream services, verify the `*_SERVICE_BASE_URL` environment variables in its Docker Compose definition are correct (pointing to Docker service names and internal ports).

## Security Considerations

1.  **Docker Secrets are paramount** for sensitive data.
2.  **Minimize default values for sensitive info** in `config.py`; require them from environment variables or secret files.
3.  **Regularly review** required environment variables and secrets for each service.
4.  Ensure the root `.env` file (for Docker Compose) and any local service `.env` files are **git-ignored**.

This guide reflects the configuration strategy for the Python-based microservices architecture.
