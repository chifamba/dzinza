import logging
import sys
from app.core.config import settings # Assuming settings are accessible

# Basic logger configuration
LOG_LEVEL_STR = getattr(settings, "LOG_LEVEL", "INFO").upper() # Default to INFO
LOG_LEVEL = getattr(logging, LOG_LEVEL_STR, logging.INFO)


# Create logger
logger = logging.getLogger(settings.PROJECT_NAME) # Use project name from settings
logger.setLevel(LOG_LEVEL)

# Prevent duplicate handlers if this module is reloaded, e.g. in some testing scenarios
if not logger.hasHandlers():
    # Create console handler and set level
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(LOG_LEVEL)

    # Create formatter
    formatter = logging.Formatter(
        "%(asctime)s - %(name)s - [%(levelname)s] - [%(module)s:%(funcName)s:%(lineno)d] - %(message)s"
    )

    # Add formatter to console_handler
    console_handler.setFormatter(formatter)

    # Add console_handler to logger
    logger.addHandler(console_handler)

# Example usage:
# from app.utils.logger import logger
# logger.info("This is an info message from genealogy service.")
# logger.error("This is an error message.", exc_info=True)

def get_logger(name: str) -> logging.Logger:
    """
    Returns a logger instance with the specified name, inheriting parent config.
    """
    return logging.getLogger(name)
