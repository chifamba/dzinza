"""Main entry point for genealogy_service service."""

from fastapi import FastAPI
from shared.app_logging import setup_logging
from shared.healthcheck import get_healthcheck_router
from handlers import router as genealogy_router

app = FastAPI()
logger = setup_logging("genealogy_service")

app.include_router(get_healthcheck_router("genealogy_service"))
app.include_router(genealogy_router)

if __name__ == "__main__":
    import uvicorn
    logger.info("Starting genealogy_service service...")
    uvicorn.run(app, host="0.0.0.0", port=8000)
