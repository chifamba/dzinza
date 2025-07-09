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
    logger.info("Connecting to MongoDB...")
    if not settings.MONGODB_URL:
        logger.error("MONGODB_URL not configured.")
        raise ValueError("MONGODB_URL not configured.")

    try:
        # Configure UUID representation to handle native UUIDs
        DataStorage.client = AsyncIOMotorClient(
            settings.MONGODB_URL,
            uuidRepresentation="standard"
        )
        # Verify connection by trying to fetch server info
        await DataStorage.client.admin.command('ping')
        DataStorage.db = DataStorage.client[settings.MONGODB_DATABASE_NAME]
        logger.info(f"Successfully connected to MongoDB. Database: {settings.MONGODB_DATABASE_NAME}")

        # TODO: Consider creating indexes here if they don't exist
        # await create_indexes(DataStorage.db)

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

# TODO: Define index creation logic
# async def create_indexes(db: AsyncIOMotorDatabase):
#     logger.info("Ensuring database indexes exist...")
#     try:
#         await db[PERSONS_COLLECTION].create_index([("tree_ids", 1)])
#         await db[PERSONS_COLLECTION].create_index([("primary_name.surname", 1), ("primary_name.given_name", 1)])
#         await db[PERSONS_COLLECTION].create_index([("birth_date_exact", 1)])
#         await db[PERSONS_COLLECTION].create_index([("death_date_exact", 1)])
#         # Add text index for searching person names, biography etc.
#         # await db[PERSONS_COLLECTION].create_index(
#         #     [("primary_name.full_name", "text"), ("biography", "text"), ("notes", "text")],
#         #     name="person_text_search_index"
#         # )

#         await db[FAMILY_TREES_COLLECTION].create_index([("owner_id", 1)])

#         await db[RELATIONSHIPS_COLLECTION].create_index([("tree_id", 1)])
#         await db[RELATIONSHIPS_COLLECTION].create_index([("person1_id", 1)])
#         await db[RELATIONSHIPS_COLLECTION].create_index([("person2_id", 1)])
#         await db[RELATIONSHIPS_COLLECTION].create_index([("relationship_type", 1)])

#         await db[EVENTS_COLLECTION].create_index([("tree_id", 1)])
#         await db[EVENTS_COLLECTION].create_index([("primary_person_id", 1)])
#         await db[EVENTS_COLLECTION].create_index([("event_type", 1)])
#         await db[EVENTS_COLLECTION].create_index([("date_exact", 1)])

#         logger.info("Database indexes ensured.")
#     except Exception as e:
#         logger.error(f"Error creating database indexes: {e}", exc_info=True)
#         # Decide if this should be a fatal error for startup
#         pass # Or raise

# The actual call to create_indexes would be in connect_to_mongo or a startup event.
# For now, it's commented out. It's an important step for performance.
