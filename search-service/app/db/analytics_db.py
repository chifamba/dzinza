from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from pymongo.errors import ConnectionFailure
import structlog
from typing import Optional

from app.core.config import settings

logger = structlog.get_logger(__name__)

class AnalyticsDataStorage:
    client: Optional[AsyncIOMotorClient] = None
    db: Optional[AsyncIOMotorDatabase] = None

async def connect_to_mongo_analytics():
    if not settings.MONGODB_ANALYTICS_ENABLED:
        logger.info("MongoDB analytics storage is disabled. Skipping connection.")
        return

    logger.info("Connecting to MongoDB for analytics...")
    if not settings.ASSEMBLED_MONGODB_URL_ANALYTICS: # Uses the property from config.py
        logger.error("Analytics MongoDB URL not configured.")
        raise ValueError("Analytics MongoDB URL not configured.")

    try:
        AnalyticsDataStorage.client = AsyncIOMotorClient(
            str(settings.ASSEMBLED_MONGODB_URL_ANALYTICS), # Ensure it's a string
            # You might want to set serverSelectionTimeoutMS to fail faster if mongo is down
            # serverSelectionTimeoutMS=5000
        )
        # Verify connection
        await AnalyticsDataStorage.client.admin.command('ping')
        AnalyticsDataStorage.db = AnalyticsDataStorage.client[settings.MONGODB_DATABASE_NAME_ANALYTICS]
        logger.info(f"Successfully connected to analytics MongoDB. Database: {settings.MONGODB_DATABASE_NAME_ANALYTICS}")

        # TODO: Consider creating indexes for analytics collection if needed
        # For example, on user_id, timestamp, query_string
        # await AnalyticsDataStorage.db["search_analytics_events"].create_index([("timestamp", -1)])

    except ConnectionFailure as e:
        logger.error(f"Analytics MongoDB connection failed: {e}", exc_info=True)
        AnalyticsDataStorage.client = None # Ensure client is None if connection failed
        AnalyticsDataStorage.db = None
        raise # Re-raise to signal startup failure if analytics DB is critical
    except Exception as e:
        logger.error(f"An error occurred during analytics MongoDB client initialization: {e}", exc_info=True)
        if AnalyticsDataStorage.client: AnalyticsDataStorage.client.close()
        AnalyticsDataStorage.client = None
        AnalyticsDataStorage.db = None
        raise

async def close_mongo_analytics_connection():
    if AnalyticsDataStorage.client:
        logger.info("Closing analytics MongoDB connection...")
        AnalyticsDataStorage.client.close()
        AnalyticsDataStorage.client = None
        AnalyticsDataStorage.db = None
        logger.info("Analytics MongoDB connection closed.")

def get_analytics_db_dependency() -> Optional[AsyncIOMotorDatabase]:
    """
    FastAPI dependency to get the analytics database instance.
    Returns None if analytics storage is disabled.
    """
    if not settings.MONGODB_ANALYTICS_ENABLED:
        return None
    if AnalyticsDataStorage.db is None:
        # This state implies an issue during startup if analytics are enabled.
        logger.error("Analytics database not initialized but accessed via dependency.")
        raise RuntimeError("Analytics database not initialized.")
    return AnalyticsDataStorage.db

# Collection name for search analytics events
SEARCH_ANALYTICS_COLLECTION = "search_analytics_events"
