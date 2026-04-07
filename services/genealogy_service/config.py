"""Configuration for genealogy_service service."""

import os

JWT_SECRET = os.environ.get("JWT_SECRET")

# Comma-separated list of allowed origins for CORS.
# E.g., "https://example.com,https://app.example.com"
# Fails secure by defaulting to an empty string (no allowed origins).
CORS_ALLOWED_ORIGINS = os.environ.get("CORS_ALLOWED_ORIGINS", "")
