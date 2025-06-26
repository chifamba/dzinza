from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from app.core.config import settings
from app.utils.logger import logger

class DataBase:
    client: AsyncIOMotorClient = None
    db: AsyncIOMotorDatabase = None

db_context = DataBase()

async def connect_to_mongo():
    logger.info(f"Connecting to MongoDB at {settings.MONGODB_URI}...")
    db_context.client = AsyncIOMotorClient(str(settings.MONGODB_URI))
    db_context.db = db_context.client[settings.MONGODB_DATABASE_NAME]
    try:
        # Ping the server to check if the connection is successful
        await db_context.client.admin.command('ping')
        logger.info("Successfully connected to MongoDB.")
    except Exception as e:
        logger.error(f"Failed to connect to MongoDB: {e}", exc_info=True)
        # Depending on policy, you might want to raise the error or exit
        raise

async def close_mongo_connection():
    if db_context.client:
        logger.info("Closing MongoDB connection...")
        db_context.client.close()
        logger.info("MongoDB connection closed.")

def get_database() -> AsyncIOMotorDatabase:
    if db_context.db is None:
        # This might happen if connect_to_mongo hasn't been called or failed.
        # Consider how to handle this: raise error, or attempt connection.
        # For FastAPI lifespan, connection is usually managed there.
        logger.error("MongoDB database instance is not available. Ensure connect_to_mongo was called.")
        raise RuntimeError("Database not initialized. Call connect_to_mongo first.")
    return db_context.db

# Example of getting a collection:
# from app.db.database import get_database
# person_collection = get_database().get_collection("persons")

# Indexes can be created here or in specific CRUD/model files upon application startup
async def create_indexes():
    """
    Creates necessary indexes for collections if they don't exist.
    Call this function during application startup.
    """
    db = get_database()
    try:
        # Example for persons collection
        await db.persons.create_index([("user_id", 1)], background=True) # User-specific data
        await db.persons.create_index([("family_tree_id", 1)], background=True)
        await db.persons.create_index([("full_name_searchable", "text")], background=True) # For text search

        # Example for family_trees collection
        await db.family_trees.create_index([("owner_id", 1)], background=True)
        await db.family_trees.create_index([("name", 1)], background=True)

        # Add other indexes as needed for relationships, notifications, etc.
        # Relationships
        await db.relationships.create_index([("family_tree_id", 1)], background=True)
        await db.relationships.create_index([("person1_id", 1)], background=True)
        await db.relationships.create_index([("person2_id", 1)], background=True)

        # Notifications
        await db.notifications.create_index([("user_id", 1), ("read", 1)], background=True)
        await db.notifications.create_index([("created_at", -1)], background=True)

        # Merge Suggestions
        await db.merge_suggestions.create_index([("family_tree_id", 1), ("status", 1)], background=True)
        await db.merge_suggestions.create_index([("person1_id", 1)], background=True)
        await db.merge_suggestions.create_index([("person2_id", 1)], background=True)

        # Person History (if used frequently for lookups by person_id)
        await db.person_history.create_index([("person_id", 1)], background=True)
        await db.person_history.create_index([("timestamp", -1)], background=True)


        logger.info("MongoDB indexes checked/created successfully.")
    except Exception as e:
        logger.error(f"Error creating MongoDB indexes: {e}", exc_info=True)
        # Depending on policy, might want to raise or handle

# Dependency for FastAPI routes to get DB instance
async def get_db_dependency() -> AsyncIOMotorDatabase:
    return get_database()
