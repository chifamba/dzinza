from pymongo import MongoClient

mongo_user = "dzinza_user"
with open("secrets/mongo_password.txt") as f:
    mongo_password = f.read().strip()
mongo_db = "dzinza_genealogy"
mongo_url = f"mongodb://{mongo_user}:{mongo_password}@localhost:27017/{mongo_db}?authSource=admin"

client = MongoClient(mongo_url)
db = client[mongo_db]
collection = db["family_trees"]

admin_user_uuid = "ee26b830-390d-499e-afbb-e8a7897ac7c6"

tree = collection.find_one({"members": {"$elemMatch": {"id": admin_user_uuid}}})
if tree:
    print("admin@dzinza.org is associated with tree:", tree.get("name"), tree.get("_id"))
else:
    print("admin@dzinza.org is NOT associated with any tree.")
