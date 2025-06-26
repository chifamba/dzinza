from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from app.core.config import settings
from app.utils.logger import logger # Assuming logger is set up in utils

class DataBase:
    client: AsyncIOMotorClient = None
    db: AsyncIOMotorDatabase = None

db_context = DataBase()

async def connect_to_mongo_storage(): # Renamed to avoid conflict if services were merged
    logger.info(f"Connecting to Storage MongoDB at {settings.MONGODB_URI}...")
    db_context.client = AsyncIOMotorClient(str(settings.MONGODB_URI))
    db_context.db = db_context.client[settings.MONGODB_DATABASE_NAME]
    try:
        await db_context.client.admin.command('ping')
        logger.info("Successfully connected to Storage MongoDB.")
    except Exception as e:
        logger.error(f"Failed to connect to Storage MongoDB: {e}", exc_info=True)
        raise

async def close_mongo_storage_connection(): # Renamed
    if db_context.client:
        logger.info("Closing Storage MongoDB connection...")
        db_context.client.close()
        logger.info("Storage MongoDB connection closed.")

def get_storage_database() -> AsyncIOMotorDatabase: # Renamed
    if db_context.db is None:
        logger.error("Storage MongoDB database instance is not available.")
        raise RuntimeError("Storage Database not initialized. Call connect_to_mongo_storage first.")
    return db_context.db

async def create_storage_indexes(): # Renamed
    """Creates necessary indexes for storage service collections."""
    db = get_storage_database()
    try:
        # Indexes for 'file_metadata' collection
        await db.file_metadata.create_index([("user_id", 1)], background=True)
        await db.file_metadata.create_index([("family_tree_id", 1)], background=True) # If files are linked to trees
        await db.file_metadata.create_index([("person_id", 1)], background=True) # If files are linked to persons
        await db.file_metadata.create_index([("file_path_s3", 1)], unique=True, sparse=True, background=True) # If s3 path is unique
        await db.file_metadata.create_index([("original_filename", 1)], background=True)
        await db.file_metadata.create_index([("tags", 1)], background=True) # If using tags as array
        await db.file_metadata.create_index([("created_at", -1)], background=True)
        await db.file_metadata.create_index([("is_temporary", 1), ("created_at", 1)], background=True) # For cleanup service

        logger.info("Storage MongoDB indexes checked/created successfully.")
    except Exception as e:
        logger.error(f"Error creating Storage MongoDB indexes: {e}", exc_info=True)

# Dependency for FastAPI routes
async def get_db_storage_dependency() -> AsyncIOMotorDatabase: # Renamed
    return get_storage_database()
