import json
import logging
from bson import ObjectId
from bson.objectid import ObjectId
from django.http import JsonResponse
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from config.config import MongoClientSingleton
from config.config import MongoClientSingleton
from django.core.validators import validate_email
from django.core.exceptions import ValidationError
from django.views.decorators.csrf import csrf_exempt
from decorators.auth_decorator import jwt_login_required
from django.views.decorators.http import require_http_methods
from django.contrib.auth.hashers import make_password, check_password

logger = logging.getLogger(__name__)

db = MongoClientSingleton.get_db()
users = db['users']

# ---------------- Get User Profile ----------------
@csrf_exempt
@jwt_login_required
def get_user_profile(request):
    try:
        user_id = request.user_id
        user_data = users.find_one({"_id": ObjectId(user_id)})
        
        if not user_data:
            return JsonResponse({"status": "error", "message": "User not found"}, status=404)
        
        # Remove sensitive data
        user_data.pop("password", None)
        user_data["_id"] = str(user_data["_id"])
        
        return JsonResponse({"status": "success", "user": user_data}, status=200)
        
    except Exception as e:
        return JsonResponse({"status": "error", "message": str(e)}, status=500)

# ---------------- Update User Profile ----------------
@csrf_exempt
@require_http_methods(["PUT"])
@jwt_login_required
def update_user_profile(request):
    try:
        user_id = request.user_id
        data = json.loads(request.body)
        
        # Fields that can be updated
        updatable_fields = [
            "username", "email", "bio", "theme", "language", 
            "preferredInputMode", "accessibilitySettings", "timezone"
        ]
        
        update_data = {}
        for field in updatable_fields:
            if field in data:
                update_data[field] = data[field]
        
        # Validate email if provided
        if "email" in update_data:
            try:
                validate_email(update_data["email"])
            except ValidationError:
                return JsonResponse({"status": "error", "message": "Invalid email format"}, status=400)
            
            # Check if email is already taken by another user
            existing_user = users.find_one({
                "email": update_data["email"],
                "_id": {"$ne": ObjectId(user_id)}
            })
            if existing_user:
                return JsonResponse({"status": "error", "message": "Email already taken"}, status=409)
        
        # Check if username is already taken by another user
        if "username" in update_data:
            existing_user = users.find_one({
                "username": update_data["username"],
                "_id": {"$ne": ObjectId(user_id)}
            })
            if existing_user:
                return JsonResponse({"status": "error", "message": "Username already taken"}, status=409)
        
        # Update the user
        result = users.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": update_data}
        )
        
        if result.modified_count == 0:
            return JsonResponse({"status": "error", "message": "No changes made"}, status=400)
        
        # Return updated user data
        updated_user = users.find_one({"_id": ObjectId(user_id)})
        updated_user.pop("password", None)
        updated_user["_id"] = str(updated_user["_id"])

        # Broadcast to WebSocket
        channel_layer = get_channel_layer()
        logger.info(f"Broadcasting profile update to user_{user_id}")
        
        async_to_sync(channel_layer.group_send)(
            f"user_{user_id}",
            {
                "type": "profile_update",
                "user": updated_user
            }
        )
        
        logger.info(f"Broadcast sent successfully for user_{user_id}")
        
        return JsonResponse({"status": "success", "user": updated_user}, status=200)

    except Exception as e:
        return JsonResponse({"status": "error", "message": str(e)}, status=500)

# ---------------- Change Password ----------------
@csrf_exempt
@require_http_methods(["POST"])
@jwt_login_required
def change_password(request):
    try:
        user_id = request.user_id
        data = json.loads(request.body)
        
        current_password = data.get("currentPassword")
        new_password = data.get("newPassword")
        
        if not all([current_password, new_password]):
            return JsonResponse({"status": "error", "message": "All password fields are required"}, status=400)
        
        if len(new_password) < 6:
            return JsonResponse({"status": "error", "message": "New password must be at least 6 characters"}, status=400)
        
        # Get user and verify current password
        user_data = users.find_one({"_id": ObjectId(user_id)})
        if not user_data or not check_password(current_password, user_data.get("password", "")):
            return JsonResponse({"status": "error", "message": "Current password is incorrect"}, status=400)
        
        # Update password
        hashed_password = make_password(new_password)
        users.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": {"password": hashed_password}}
        )
        
        return JsonResponse({"status": "success", "message": "Password updated successfully"}, status=200)
        
    except Exception as e:
        return JsonResponse({"status": "error", "message": str(e)}, status=500)