"""Configuration for auth_service service."""

import os

DATABASE_URL = os.environ.get("DATABASE_URL")
JWT_SECRET = os.environ.get("JWT_SECRET")
GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID")
REDIS_URL = os.environ.get("REDIS_URL", "redis://redis:6379/0")

# Comma-separated list of allowed origins for CORS.
# E.g., "https://example.com,https://app.example.com"
# Fails secure by defaulting to an empty string (no allowed origins).
CORS_ALLOWED_ORIGINS = os.environ.get("CORS_ALLOWED_ORIGINS", "")
