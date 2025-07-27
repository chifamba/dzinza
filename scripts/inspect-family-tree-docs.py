from pymongo import MongoClient
import pprint

mongo_user = "dzinza_user"
with open("secrets/mongo_password.txt") as f:
    mongo_password = f.read().strip()
mongo_db = "dzinza_genealogy"
mongo_url = f"mongodb://{mongo_user}:{mongo_password}@localhost:27017/{mongo_db}?authSource=admin"

client = MongoClient(mongo_url)
db = client[mongo_db]
collection = db["family_trees"]

for doc in collection.find().limit(5):
    pprint.pprint(doc)
