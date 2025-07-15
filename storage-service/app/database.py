from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from .config import settings

class DataStorage:
    client: AsyncIOMotorClient = None
    db: AsyncIOMotorDatabase = None

async def connect_to_mongo():
    print(f"Attempting to connect to MongoDB at: {settings.ASSEMBLED_MONGODB_URI}")
    DataStorage.client = AsyncIOMotorClient(settings.ASSEMBLED_MONGODB_URI)
    DataStorage.db = DataStorage.client[settings.MONGO_DB_NAME] # MONGO_DB_NAME from config
    try:
        # The ismaster command is cheap and does not require auth.
        await DataStorage.client.admin.command('ismaster')
        print(f"Successfully connected to MongoDB, database: {settings.MONGO_DB_NAME}")
    except Exception as e:
        print(f"Failed to connect to MongoDB: {e}")
        # Depending on policy, might raise error or allow app to start and retry later
        raise

async def close_mongo_connection():
    if DataStorage.client:
        DataStorage.client.close()
        print("MongoDB connection closed.")

def get_database() -> AsyncIOMotorDatabase:
    if DataStorage.db is None:
        # This state should ideally not be reached if connect_to_mongo is called on startup
        raise Exception("Database not initialized. Call connect_to_mongo on app startup.")
    return DataStorage.db

# Example of getting a collection
# def get_file_collection() -> AsyncIOMotorCollection:
#     db = get_database()
#     return db.get_collection("files")
