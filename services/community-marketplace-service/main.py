from fastapi import FastAPI
from shared.logging import setup_logging
from shared.healthcheck import get_healthcheck_router

app = FastAPI()
logger = setup_logging("community-marketplace-service")

app.include_router(get_healthcheck_router("community-marketplace-service"))
