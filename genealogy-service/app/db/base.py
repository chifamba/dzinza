from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase, AsyncIOMotorCollection
from pymongo.errors import ConnectionFailure
from pymongo import MongoClient
from bson.codec_options import CodecOptions
from bson.binary import UuidRepresentation
import structlog

from app.core.config import settings

logger = structlog.get_logger(__name__)

class DataStorage:
    client: AsyncIOMotorClient = None
    db: AsyncIOMotorDatabase = None

async def connect_to_mongo():
    logger.info("Connecting to MongoDB with connection pooling...")
    if not settings.MONGODB_URL:
        logger.error("MONGODB_URL not configured.")
        raise ValueError("MONGODB_URL not configured.")

    try:
        # Configure MongoDB client with connection pooling
        DataStorage.client = AsyncIOMotorClient(
            settings.MONGODB_URL,
            uuidRepresentation="standard",
            # Connection Pool Configuration
            minPoolSize=settings.MONGODB_MIN_POOL_SIZE,
            maxPoolSize=settings.MONGODB_MAX_POOL_SIZE,
            maxIdleTimeMS=settings.MONGODB_MAX_IDLE_TIME_MS,
            # Timeout Configuration
            connectTimeoutMS=settings.MONGODB_CONNECT_TIMEOUT_MS,
            serverSelectionTimeoutMS=settings.MONGODB_SERVER_SELECTION_TIMEOUT_MS,
            socketTimeoutMS=settings.MONGODB_SOCKET_TIMEOUT_MS,
            waitQueueTimeoutMS=settings.MONGODB_WAIT_QUEUE_TIMEOUT_MS,
            # Monitoring and Health
            heartbeatFrequencyMS=settings.MONGODB_HEARTBEAT_FREQUENCY_MS,
            # Performance optimizations
            retryWrites=True,
            retryReads=True,
            # Compression for better network performance
            compressors=['zstd', 'zlib', 'snappy'],
            # Read preference for better load distribution
            readPreference='secondaryPreferred'
        )
        
        # Verify connection by trying to fetch server info
        server_info = await DataStorage.client.admin.command('ping')
        DataStorage.db = DataStorage.client[settings.MONGODB_DATABASE_NAME]
        
        logger.info(
            f"Successfully connected to MongoDB. "
            f"Database: {settings.MONGODB_DATABASE_NAME}, "
            f"Pool size: {settings.MONGODB_MIN_POOL_SIZE}-{settings.MONGODB_MAX_POOL_SIZE}, "
            f"Server info: {server_info}"
        )

        # Create indexes for better performance
        await create_indexes(DataStorage.db)

    except ConnectionFailure as e:
        logger.error(f"MongoDB connection failed: {e}", exc_info=True)
        # Depending on policy, either raise error or handle reconnect logic
        raise
    except Exception as e:  # Catch other potential errors during client init
        logger.error(f"An error occurred during MongoDB client initialization: {e}", exc_info=True)
        raise

async def close_mongo_connection():
    if DataStorage.client:
        logger.info("Closing MongoDB connection...")
        DataStorage.client.close()
        DataStorage.client = None
        DataStorage.db = None
        logger.info("MongoDB connection closed.")

def get_database() -> AsyncIOMotorDatabase:
    """
    Dependency to get the database instance.
    Ensures that the database is initialized.
    """
    if DataStorage.db is None:
        # This might happen if an endpoint is hit before startup event completes,
        # or if connect_to_mongo failed silently (though it shouldn't).
        logger.error("Database not initialized. Call connect_to_mongo during application startup.")
        # Depending on strictness, could raise an exception or try a lazy connect (not recommended for FastAPI startup events).
        raise RuntimeError("Database not initialized. Ensure connect_to_mongo is called at startup.")
    return DataStorage.db

# Collection names (centralize them here)
FAMILY_TREES_COLLECTION = "family_trees"
PERSONS_COLLECTION = "persons"
RELATIONSHIPS_COLLECTION = "relationships"
EVENTS_COLLECTION = "events"
NOTIFICATIONS_COLLECTION = "notifications"
MERGE_SUGGESTIONS_COLLECTION = "merge_suggestions"
PERSON_HISTORY_COLLECTION = "person_history"
# Add other collections as needed: SOURCES_COLLECTION, GEDCOM_IMPORTS_COLLECTION, etc.


# Example: Function to get a specific collection
def get_collection(collection_name: str) -> AsyncIOMotorCollection:
    db = get_database()
    return db[collection_name]

# Index creation logic for better performance
async def create_indexes(db: AsyncIOMotorDatabase):
    """Create database indexes for improved query performance."""
    logger.info("Creating database indexes for optimal performance...")
    try:
        # Person collection indexes
        await db[PERSONS_COLLECTION].create_index([("tree_ids", 1)], background=True)
        await db[PERSONS_COLLECTION].create_index(
            [("primary_name.surname", 1), ("primary_name.given_name", 1)], 
            background=True
        )
        await db[PERSONS_COLLECTION].create_index([("birth_date_exact", 1)], background=True)
        await db[PERSONS_COLLECTION].create_index([("death_date_exact", 1)], background=True)
        await db[PERSONS_COLLECTION].create_index([("gender", 1)], background=True)
        await db[PERSONS_COLLECTION].create_index([("is_living", 1)], background=True)
        
        # Compound index for person searches
        await db[PERSONS_COLLECTION].create_index(
            [("tree_ids", 1), ("primary_name.surname", 1)], 
            background=True
        )
        
        # Text index for searching person names, biography etc.
        await db[PERSONS_COLLECTION].create_index(
            [("primary_name.given_name", "text"), ("primary_name.surname", "text"), 
             ("biography", "text"), ("notes", "text")],
            name="person_text_search_index",
            background=True
        )

        # Family Trees collection indexes
        await db[FAMILY_TREES_COLLECTION].create_index([("owner_id", 1)], background=True)
        await db[FAMILY_TREES_COLLECTION].create_index([("privacy", 1)], background=True)
        await db[FAMILY_TREES_COLLECTION].create_index([("created_at", -1)], background=True)

        # Relationships collection indexes
        await db[RELATIONSHIPS_COLLECTION].create_index([("tree_id", 1)], background=True)
        await db[RELATIONSHIPS_COLLECTION].create_index([("person1_id", 1)], background=True)
        await db[RELATIONSHIPS_COLLECTION].create_index([("person2_id", 1)], background=True)
        await db[RELATIONSHIPS_COLLECTION].create_index([("relationship_type", 1)], background=True)
        
        # Compound indexes for relationship queries
        await db[RELATIONSHIPS_COLLECTION].create_index(
            [("tree_id", 1), ("person1_id", 1)], 
            background=True
        )
        await db[RELATIONSHIPS_COLLECTION].create_index(
            [("tree_id", 1), ("person2_id", 1)], 
            background=True
        )

        # Events collection indexes
        await db[EVENTS_COLLECTION].create_index([("tree_id", 1)], background=True)
        await db[EVENTS_COLLECTION].create_index([("primary_person_id", 1)], background=True)
        await db[EVENTS_COLLECTION].create_index([("event_type", 1)], background=True)
        await db[EVENTS_COLLECTION].create_index([("date_exact", 1)], background=True)
        await db[EVENTS_COLLECTION].create_index([("place", 1)], background=True)
        
        # Compound index for event queries
        await db[EVENTS_COLLECTION].create_index(
            [("tree_id", 1), ("primary_person_id", 1)], 
            background=True
        )

        # Notifications collection indexes
        await db[NOTIFICATIONS_COLLECTION].create_index([("user_id", 1)], background=True)
        await db[NOTIFICATIONS_COLLECTION].create_index([("is_read", 1)], background=True)
        await db[NOTIFICATIONS_COLLECTION].create_index([("created_at", -1)], background=True)
        await db[NOTIFICATIONS_COLLECTION].create_index(
            [("user_id", 1), ("is_read", 1)], 
            background=True
        )

        # Merge Suggestions collection indexes
        await db[MERGE_SUGGESTIONS_COLLECTION].create_index([("person1_id", 1)], background=True)
        await db[MERGE_SUGGESTIONS_COLLECTION].create_index([("person2_id", 1)], background=True)
        await db[MERGE_SUGGESTIONS_COLLECTION].create_index([("status", 1)], background=True)
        await db[MERGE_SUGGESTIONS_COLLECTION].create_index([("created_at", -1)], background=True)

        # Person History collection indexes
        await db[PERSON_HISTORY_COLLECTION].create_index([("person_id", 1)], background=True)
        await db[PERSON_HISTORY_COLLECTION].create_index([("version", -1)], background=True)
        await db[PERSON_HISTORY_COLLECTION].create_index(
            [("person_id", 1), ("version", -1)], 
            background=True
        )
        await db[PERSON_HISTORY_COLLECTION].create_index([("changed_by_user_id", 1)], background=True)

        logger.info("Database indexes created successfully.")
    except Exception as e:
        logger.error(f"Error creating database indexes: {e}", exc_info=True)
        # Don't make index creation a fatal error - the service can still function
        pass

async def get_connection_pool_stats() -> dict:
    """Get connection pool statistics for monitoring."""
    if not DataStorage.client:
        return {"error": "No connection available"}
    
    try:
        # Get server status for connection info
        server_status = await DataStorage.client.admin.command("serverStatus")
        
        return {
            "connections": {
                "current": server_status.get("connections", {}).get("current", 0),
                "available": server_status.get("connections", {}).get("available", 0),
                "total_created": server_status.get("connections", {}).get("totalCreated", 0)
            },
            "pool_config": {
                "min_pool_size": settings.MONGODB_MIN_POOL_SIZE,
                "max_pool_size": settings.MONGODB_MAX_POOL_SIZE,
                "max_idle_time_ms": settings.MONGODB_MAX_IDLE_TIME_MS
            },
            "database": settings.MONGODB_DATABASE_NAME
        }
    except Exception as e:
        logger.error(f"Error getting connection pool stats: {e}")
        return {"error": str(e)}


async def check_database_health() -> dict:
    """Check database health and connection status."""
    if DataStorage.client is None or DataStorage.db is None:
        return {
            "status": "unhealthy",
            "error": "Database not initialized"
        }
    
    try:
        # Test basic connectivity
        await DataStorage.client.admin.command('ping')
        
        # Test database access
        await DataStorage.db.command('ping')
        
        # Get basic stats
        stats = await DataStorage.db.command('dbStats')
        
        return {
            "status": "healthy",
            "database": settings.MONGODB_DATABASE_NAME,
            "collections": stats.get("collections", 0),
            "objects": stats.get("objects", 0),
            "data_size": stats.get("dataSize", 0),
            "storage_size": stats.get("storageSize", 0)
        }
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        return {
            "status": "unhealthy",
            "error": str(e)
        }
