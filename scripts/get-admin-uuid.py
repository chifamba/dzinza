from pymongo import MongoClient

mongo_user = "dzinza_user"
with open("secrets/mongo_password.txt") as f:
    mongo_password = f.read().strip()
mongo_db = "dzinza_genealogy"
mongo_url = f"mongodb://{mongo_user}:{mongo_password}@localhost:27017/{mongo_db}?authSource=admin"

client = MongoClient(mongo_url)
db = client[mongo_db]
users = db["users"]

admin = users.find_one({"email": "admin@dzinza.org"})
print("Admin UUID:", admin.get("id"))
