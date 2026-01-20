"""Main entry point for deduplication_service service."""

from fastapi import FastAPI
from shared.app_logging import setup_logging
from shared.healthcheck import get_healthcheck_router

app = FastAPI()
logger = setup_logging("deduplication_service")

app.include_router(get_healthcheck_router("deduplication_service"))

if __name__ == "__main__":
    import uvicorn
    logger.info("Starting deduplication_service service...")
    uvicorn.run(app, host="0.0.0.0", port=8000)
