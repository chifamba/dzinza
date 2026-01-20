"""Main entry point for auth_service service."""

from fastapi import FastAPI
from shared.app_logging import setup_logging
from shared.healthcheck import get_healthcheck_router
from database import Base, engine
import handlers

# Create the database tables
Base.metadata.create_all(bind=engine)

app = FastAPI()
logger = setup_logging("auth_service")

from fastapi.middleware.cors import CORSMiddleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify the frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(get_healthcheck_router("auth_service"))
app.include_router(handlers.router)


if __name__ == "__main__":
    import uvicorn
    logger.info("Starting auth_service service...")
    uvicorn.run(app, host="0.0.0.0", port=8000)
