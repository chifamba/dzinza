"""Configuration for genealogy_service service."""

import os

JWT_SECRET = os.environ.get("JWT_SECRET")

if not JWT_SECRET:
    raise RuntimeError("JWT_SECRET environment variable is not set")
