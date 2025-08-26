from datetime import datetime
from bson.objectid import ObjectId
from config.config import MongoClientSingleton

db = MongoClientSingleton.get_db()
users = db['users']

class MongoUser:
    def __init__(self, user_data):
        self.id = str(user_data["_id"])
        self.username = user_data.get("username") or user_data.get("email")
        self.is_authenticated = True

def get_user_collection():
    return users

def get_or_create_user_oauth(profile):
    email = profile.get("email")
    username = profile.get("name", email.split("@")[0])

    user_data = users.find_one({"email": email})
    if user_data:
        return MongoUser(user_data)

    new_user = {
        "username": username,
        "email": email,
        "created_at": datetime.utcnow(),
        "is_oauth": True
    }
    result = users.insert_one(new_user)
    new_user["_id"] = result.inserted_id
    return MongoUser(new_user)
