from celery import Celery
from celery.signals import worker_process_init, worker_process_shutdown
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
import asyncio
from typing import Optional

from app.core.config import settings
import structlog

logger = structlog.get_logger(__name__)

# Celery App State for storing DB client per worker process
class CeleryAppState:
    db_client: Optional[AsyncIOMotorClient] = None
    db: Optional[AsyncIOMotorDatabase] = None

celery_app_state = CeleryAppState()

# Initialize Celery
# The first argument is the name of the current module, important for Celery's auto-discovery of tasks.
# The second argument 'broker' specifies the URL of the message broker (Redis in this case).
# The third argument 'backend' specifies the URL of the result backend.
celery_app = Celery(
    "genealogy_tasks", # Name of the Celery application module
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    include=[ # List of modules to import when the worker starts, so tasks are registered
        "app.services.tasks" # Assuming tasks will be defined in app.services.tasks
    ]
)

# Optional Celery configuration (can also be set in config.py and loaded here)
celery_app.conf.update(
    task_serializer="json", # Default is pickle, json is generally safer for web apps
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC", # Ensure timezone consistency
    enable_utc=True,
    # task_acks_late=True, # If you want tasks to be acknowledged after they complete/fail
    # worker_prefetch_multiplier=1, # Can be useful for long-running tasks
    # worker_concurrency=4, # Example: set number of worker processes
)

# You can also load configuration from the main app settings if preferred:
# celery_app.config_from_object(settings, namespace='CELERY')
# This would require Celery specific settings in your Pydantic Settings class
# to be prefixed with CELERY_ (e.g., CELERY_BROKER_URL).
# Since settings.CELERY_BROKER_URL is already defined, direct usage is fine.

# Example of how to log Celery startup
# This isn't a task, but just shows the logger.
# This code block itself doesn't run unless this module is imported and celery_app is used.
logger.info(
    "Celery app initialized",
    broker_url=settings.CELERY_BROKER_URL,
    backend_url=settings.CELERY_RESULT_BACKEND,
    included_tasks_modules=celery_app.conf.include
)

# To run a Celery worker for this app (from the project root, assuming genealogy-service is a module):
# celery -A genealogy-service.app.services.celery_app.celery_app worker -l info -P eventlet (for async on Windows) or -P gevent or default
# Or from within the genealogy-service directory:
# celery -A app.services.celery_app.celery_app worker -l info

# The main FastAPI app might not directly "start" the Celery worker in its process.
# Celery workers are typically run as separate processes.
# However, the FastAPI app will use this `celery_app` instance to send tasks.
# e.g., `from .celery_app import celery_app; celery_app.send_task('app.services.tasks.my_task', args=[...])`

# If you need to perform actions on FastAPI startup/shutdown related to Celery (e.g. checking broker connection),
# those would go in main.py's event handlers, potentially using this celery_app instance.
# For now, this file just defines the Celery app.


# --- Celery Worker Process Initialization/Shutdown for DB Connection ---

@worker_process_init.connect(weak=False)
def init_db_connection(**kwargs):
    """Initialize DB connection when a Celery worker process starts."""
    logger.info("Celery worker process init: Initializing MongoDB connection...")
    if not settings.MONGODB_URL:
        logger.error("Celery worker: MONGODB_URL not configured.")
        # This error will likely prevent the worker from starting properly or tasks from running.
        # Consider raising an exception or ensuring settings are always available.
        return

    # Each worker process needs its own event loop for its DB client
    # This loop is not for the tasks themselves, but for this init/shutdown logic.
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)

    try:
        celery_app_state.db_client = AsyncIOMotorClient(settings.MONGODB_URL)
        # Perform a ping to verify connection
        loop.run_until_complete(celery_app_state.db_client.admin.command('ping'))
        celery_app_state.db = celery_app_state.db_client[settings.MONGODB_DATABASE_NAME]
        logger.info(f"Celery worker: MongoDB connection successful. DB: {settings.MONGODB_DATABASE_NAME}")
    except Exception as e:
        logger.error(f"Celery worker: MongoDB connection failed during init: {e}", exc_info=True)
        if celery_app_state.db_client:
            celery_app_state.db_client.close()
        celery_app_state.db_client = None
        celery_app_state.db = None
        # Optionally re-raise to make worker startup fail if DB is critical
        # raise
    finally:
        # It's important not to close the loop here if other async init steps might use it.
        # Or ensure all async init is done within this loop.
        # For just this DB client, it's okay.
        pass


@worker_process_shutdown.connect(weak=False)
def close_db_connection(**kwargs):
    """Close DB connection when a Celery worker process shuts down."""
    logger.info("Celery worker process shutdown: Closing MongoDB connection...")
    if celery_app_state.db_client:
        celery_app_state.db_client.close()
        celery_app_state.db_client = None
        celery_app_state.db = None
        logger.info("Celery worker: MongoDB connection closed.")
    # No separate event loop needed here as close() is synchronous for Motor client.

# Tasks will access the DB via `celery_app_state.db`
# They will still need to manage their own asyncio event loop if they call async DB operations.

# Simple ping task for testing worker connectivity
@celery_app.task(name="app.services.tasks.ping")
def ping():
    """Simple ping task to test worker connectivity."""
    return "pong"
