import logging
import sys
from app.core.config import settings

LOG_LEVEL_STR = getattr(settings, "LOG_LEVEL", "INFO").upper()
LOG_LEVEL = getattr(logging, LOG_LEVEL_STR, logging.INFO)

logger = logging.getLogger(settings.PROJECT_NAME)
logger.setLevel(LOG_LEVEL)

if not logger.hasHandlers():
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(LOG_LEVEL)
    formatter = logging.Formatter(
        "%(asctime)s - %(name)s - [%(levelname)s] - [%(module)s:%(funcName)s:%(lineno)d] - %(message)s"
    )
    console_handler.setFormatter(formatter)
    logger.addHandler(console_handler)

def get_logger(name: str) -> logging.Logger:
    return logging.getLogger(name)
