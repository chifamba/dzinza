from datetime import datetime
from typing import List, Optional

from motor.motor_asyncio import AsyncIOMotorDatabase

from app.analytics_models import SearchAnalyticsEventDB # DB Model for analytics
from app.db.analytics_db import SEARCH_ANALYTICS_COLLECTION # Collection name
from app.core.config import settings # To check if analytics are enabled
import structlog

logger = structlog.get_logger(__name__)

async def log_search_event(
    db: AsyncIOMotorDatabase, # This should be the analytics DB instance
    *,
    event_data: SearchAnalyticsEventDB
) -> Optional[SearchAnalyticsEventDB]:
    """
    Logs a search analytics event to MongoDB.
    Returns the logged event if successful, None otherwise or if analytics are disabled.
    """
    if not settings.MONGODB_ANALYTICS_ENABLED:
        logger.debug("Search analytics logging is disabled. Skipping log_search_event.")
        return None

    if db is None: # Should not happen if get_analytics_db_dependency is used correctly
        logger.error("Analytics database not provided to log_search_event.")
        return None

    collection = db[SEARCH_ANALYTICS_COLLECTION]

    try:
        # Ensure timestamp is set if not already (model has default_factory, but good practice)
        if not event_data.timestamp:
            event_data.timestamp = datetime.utcnow()

        # The event_data should already be an instance of SearchAnalyticsEventDB
        # which handles its own default ID.
        await collection.insert_one(event_data.model_dump(by_alias=True))
        logger.debug("Search analytics event logged successfully.", event_id=event_data.id, query=event_data.query_string)
        return event_data
    except Exception as e:
        logger.error("Failed to log search analytics event to MongoDB.", error=str(e), exc_info=True)
        return None


# Example function to retrieve analytics (more complex queries would go here)
async def get_recent_search_analytics(
    db: AsyncIOMotorDatabase, # Analytics DB
    *,
    limit: int = 100
) -> List[SearchAnalyticsEventDB]:
    """
    Retrieves recent search analytics events. (Example - not for general API use without auth)
    """
    if not settings.MONGODB_ANALYTICS_ENABLED or db is None:
        return []

    collection = db[SEARCH_ANALYTICS_COLLECTION]
    events = []
    cursor = collection.find().sort("timestamp", -1).limit(limit)
    async for doc in cursor:
        events.append(SearchAnalyticsEventDB(**doc))
    return events
