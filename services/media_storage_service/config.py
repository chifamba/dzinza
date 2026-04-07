"""Configuration for media_storage_service service."""

import os

MINIO_ENDPOINT = os.getenv("MINIO_ENDPOINT", "garage1:39000")
MINIO_BUCKET = os.getenv("MINIO_BUCKET", "media")

MINIO_ACCESS_KEY = os.getenv("MINIO_ACCESS_KEY")
if not MINIO_ACCESS_KEY:
    raise RuntimeError("MINIO_ACCESS_KEY environment variable is missing")

MINIO_SECRET_KEY = os.getenv("MINIO_SECRET_KEY")
if not MINIO_SECRET_KEY:
    raise RuntimeError("MINIO_SECRET_KEY environment variable is missing")
