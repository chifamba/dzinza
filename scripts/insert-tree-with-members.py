from pymongo import MongoClient
from datetime import datetime

# User UUIDs and emails (from Postgres)
test_user_uuid = "4493168c-6ac2-494a-8b88-aba88e7db8f0"
admin_user_uuid = "ee26b830-390d-499e-afbb-e8a7897ac7c6"
test_user_email = "test@dzinza.com"
admin_user_email = "admin@dzinza.org"

mongo_user = "dzinza_user"
with open("secrets/mongo_password.txt") as f:
    mongo_password = f.read().strip()
mongo_db = "dzinza_genealogy"
mongo_url = f"mongodb://{mongo_user}:{mongo_password}@localhost:27017/{mongo_db}?authSource=admin"

client = MongoClient(mongo_url)
db = client[mongo_db]
collection = db["family_trees"]

record = {
    "userId": test_user_uuid,  # owner_id in backend mapping
    "name": "Shared Family Tree",
    "description": "Tree shared between test and admin users.",
    "privacy": "PRIVATE",  # Use uppercase for compatibility with backend model
    "createdAt": datetime.utcnow(),
    "updatedAt": datetime.utcnow(),
    "settings": {},
    "statistics": {},
    "members": [
        {"id": test_user_uuid, "name": test_user_email},
        {"id": admin_user_uuid, "name": admin_user_email}
    ]
}

result = collection.insert_one(record)
print("Inserted shared tree ID:", result.inserted_id)
