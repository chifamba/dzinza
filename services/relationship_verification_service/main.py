"""Main entry point for relationship_verification_service service."""

from fastapi import FastAPI
from shared.app_logging import setup_logging
from shared.healthcheck import get_healthcheck_router

app = FastAPI()
logger = setup_logging("relationship_verification_service")

app.include_router(get_healthcheck_router("relationship_verification_service"))

if __name__ == "__main__":
    import uvicorn
    logger.info("Starting relationship_verification_service service...")
    uvicorn.run(app, host="0.0.0.0", port=8000)
