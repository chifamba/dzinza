"""Main entry point for auth_service service."""

from fastapi import FastAPI
from shared.app_logging import setup_logging
from shared.healthcheck import get_healthcheck_router
from . import handlers
from .database import engine, Base

# Create the database tables
Base.metadata.create_all(bind=engine)

app = FastAPI()
logger = setup_logging("auth_service")

app.include_router(get_healthcheck_router("auth_service"))
app.include_router(handlers.router, prefix="/auth", tags=["auth"])

if __name__ == "__main__":
    import uvicorn
    logger.info("Starting auth_service service...")
    uvicorn.run(app, host="0.0.0.0", port=8000)
