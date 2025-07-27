from pymongo import MongoClient
from datetime import datetime

mongo_user = "dzinza_user"
with open("secrets/mongo_password.txt") as f:
    mongo_password = f.read().strip()
mongo_db = "dzinza_genealogy"
mongo_url = f"mongodb://{mongo_user}:{mongo_password}@localhost:27017/{mongo_db}?authSource=admin"

client = MongoClient(mongo_url)
db = client[mongo_db]
collection = db["family_trees"]

record = {
    "userId": "dev-user-123",
    "name": "My First Family Tree",
    "description": "Automatically created for new users.",
    "privacy": "private",
    "createdAt": datetime.utcnow(),
    "updatedAt": datetime.utcnow(),
    "settings": {},
    "statistics": {}
}

result = collection.insert_one(record)
print("Inserted record ID:", result.inserted_id)
