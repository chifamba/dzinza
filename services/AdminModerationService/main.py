from fastapi import FastAPI
from shared.logging import setup_logging
from shared.healthcheck import get_healthcheck_router

app = FastAPI()
logger = setup_logging("AdminModerationService")

app.include_router(get_healthcheck_router("AdminModerationService"))
