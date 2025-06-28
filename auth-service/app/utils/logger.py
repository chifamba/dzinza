import logging
import sys
from app.core.config import settings

# Basic logger configuration
# For production, consider using a structured logging library like structlog
# and configuring handlers for different environments (e.g., JSON logs for log aggregators).

LOG_LEVEL = logging.DEBUG if settings.ENVIRONMENT == "development" else logging.INFO

# Create logger
logger = logging.getLogger(settings.PROJECT_NAME)
logger.setLevel(LOG_LEVEL)

# Create console handler and set level
console_handler = logging.StreamHandler(sys.stdout)
console_handler.setLevel(LOG_LEVEL)

# Create formatter
formatter = logging.Formatter(
    "%(asctime)s - %(name)s - %(levelname)s - %(module)s:%(lineno)d - %(message)s"
)

# Add formatter to console_handler
console_handler.setFormatter(formatter)

# Add console_handler to logger
if not logger.hasHandlers(): # Avoid adding multiple handlers if this module is reloaded
    logger.addHandler(console_handler)

# Example usage:
# from app.utils.logger import logger
# logger.info("This is an info message.")
# logger.error("This is an error message.", exc_info=True) # To include exception info

# You might want to integrate with OpenTelemetry logging for correlation
# from opentelemetry.sdk._logs import LoggingHandler (this path might change based on OTel version)
# otel_logging_handler = LoggingHandler()
# logger.addHandler(otel_logging_handler)

def get_logger(name: str) -> logging.Logger:
    """
    Returns a logger instance with the specified name, inheriting parent config.
    """
    return logging.getLogger(name)
