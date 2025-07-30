"""Main entry point for graph_query_service service."""

from fastapi import FastAPI
from shared.app_logging import setup_logging
from shared.healthcheck import get_healthcheck_router

app = FastAPI()
logger = setup_logging("graph_query_service")

app.include_router(get_healthcheck_router("graph_query_service"))

if __name__ == "__main__":
    import uvicorn
    logger.info("Starting graph_query_service service...")
    uvicorn.run(app, host="0.0.0.0", port=8000)
