"""
MongoDB analytics service for search analytics tracking.
"""
from typing import Optional, Dict, Any
from datetime import datetime, timezone
from uuid import uuid4
import structlog
from motor.motor_asyncio import AsyncIOMotorClient

from ..core.config import settings

logger = structlog.get_logger(__name__)


class AnalyticsDataStorage:
    """MongoDB client for analytics data storage."""
    
    def __init__(self):
        self.client: Optional[AsyncIOMotorClient] = None
        self.database = None
        self.collection = None
    
    async def initialize(self):
        """Initialize MongoDB client."""
        if not settings.MONGODB_ANALYTICS_ENABLED:
            logger.info("MongoDB analytics disabled")
            return True
            
        try:
            self.client = AsyncIOMotorClient(settings.MONGODB_URL_ANALYTICS)
            self.database = self.client[settings.MONGODB_DATABASE_NAME_ANALYTICS]
            self.collection = self.database.search_analytics
            
            # Test connection
            await self.client.admin.command('ping')
            logger.info("Successfully connected to MongoDB analytics database")
            return True
            
        except Exception as e:
            logger.error("Error connecting to MongoDB analytics", error=str(e))
            return False
    
    async def log_search(
        self, 
        query: Dict[str, Any], 
        results_count: int, 
        response_time_ms: int
    ):
        """Log search analytics."""
        if not self.collection:
            return
            
        try:
            analytics_doc = {
                "query": query,
                "results_count": results_count,
                "response_time_ms": response_time_ms,
                "timestamp": datetime.now(timezone.utc),
                "session_id": str(uuid4())
            }
            
            await self.collection.insert_one(analytics_doc)
            
        except Exception as e:
            logger.error("Error logging search analytics", error=str(e))
    
    async def close(self):
        """Close MongoDB client."""
        if self.client:
            self.client.close()
            logger.info("MongoDB analytics connection closed")
