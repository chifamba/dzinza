"""Main entry point for extended_services_openapi service."""

from fastapi import FastAPI
from shared.app_logging import setup_logging
from shared.healthcheck import get_healthcheck_router

app = FastAPI()
logger = setup_logging("extended_services_openapi")

app.include_router(get_healthcheck_router("extended_services_openapi"))

if __name__ == "__main__":
    import uvicorn
    logger.info("Starting extended_services_openapi service...")
    uvicorn.run(app, host="0.0.0.0", port=8000)
