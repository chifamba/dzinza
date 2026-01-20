"""Configuration for genealogy_service service."""

import os

JWT_SECRET = os.environ.get("JWT_SECRET")
