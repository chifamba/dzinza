"""Configuration for auth_service service."""

import os

DATABASE_URL = os.environ.get("DATABASE_URL")
JWT_SECRET = os.environ.get("JWT_SECRET")
GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID")
REDIS_URL = os.environ.get("REDIS_URL", "redis://redis:6379/0")
