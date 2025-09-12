import json
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST
from django.utils import timezone
from django.core.exceptions import ValidationError
from django.core.validators import validate_email
from django.contrib.auth.hashers import make_password, check_password
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny
from django.shortcuts import redirect
from django.conf import settings
from config.config import MongoClientSingleton
from config.token import generate_jwt, decode_jwt
from .auth_helper import get_or_create_user_oauth

# ----- TODO: I'll implement Google OAuth Later -----

# from google.oauth2 import id_token
# from google.auth.transport import requests as google_requests

db = MongoClientSingleton.get_db()
users = db['users']

# ---------------- Regular Registration ----------------
@csrf_exempt
@require_POST
def register_user(request):
    try:
        data = json.loads(request.body)
        # print("the user: ", data)
        username = data.get("username", "").strip()
        email = data.get("email", "").strip()
        password = data.get("password", "").strip()

        if not all([username, email, password]):
            raise ValidationError("All fields are required")

        validate_email(email)

        if len(password) < 6:
            raise ValidationError("Password must be at least 6 characters")

        if users.find_one({"username": username}):
            return JsonResponse({"status": "error", "message": "Username already taken"}, status=409)
        if users.find_one({"email": email}):
            return JsonResponse({"status": "error", "message": "Email already registered"}, status=409)

        hashed_password = make_password(password)
        user_doc = {
            "username": username,
            "email": email,
            "password": hashed_password,
            "created_at": timezone.now(),
            "theme": "light",
            "language": "en",
            "avatarUrl": "",
            "bio": "Hub User",
            "preferredInputMode": "text",
            "accessibilitySettings": {"ttsEnabled": False, "sttEnabled": False},
            "timezone": "UTC",
        }
        
        result = users.insert_one(user_doc)
        user_id = str(result.inserted_id)

        access = generate_jwt(user_id, username, email)
        # print(access)

        response_user = {
            "id": user_id,
            "username": username,
            "email": email,
            "theme": user_doc["theme"],
            "language": user_doc["language"],
            "avatarUrl": user_doc["avatarUrl"],
            "bio": user_doc["bio"],
            "preferredInputMode": user_doc["preferredInputMode"],
            "accessibilitySettings": user_doc["accessibilitySettings"],
            "timezone": user_doc["timezone"],
        }

        return JsonResponse({"status": "success", "access": access, "user": response_user}, status=201)

    except Exception as e:
        return JsonResponse({"status": "error", "message": str(e)}, status=400)


# ---------------- Login ----------------
@csrf_exempt
@require_POST
def login_user(request):
    try:
        data = json.loads(request.body)
        username_or_email = data.get("username_or_email", "").strip()
        password = data.get("password", "").strip()

        if not all([username_or_email, password]):
            raise ValidationError("Username/Email and password are required")

        user_data = users.find_one({
            "$or": [
                {"username": username_or_email},
                {"email": username_or_email}
            ]
        })

        if not user_data or not check_password(password, user_data.get("password", "")):
            return JsonResponse({"status": "error", "message": "Invalid credentials"}, status=400)

        access = generate_jwt(str(user_data["_id"]), user_data["username"], user_data["email"])

        response_user = {
            "id": str(user_data["_id"]),
            "username": user_data.get("username"),
            "email": user_data.get("email"),
            "theme": user_data.get("theme", "light"),
            "language": user_data.get("language", "en"),
            "avatarUrl": user_data.get("avatarUrl", ""),
            "bio": user_data.get("bio", ""),
            "preferredInputMode": user_data.get("preferredInputMode", "text"),
            "accessibilitySettings": user_data.get("accessibilitySettings", {"ttsEnabled": False, "sttEnabled": False}),
            "timezone": user_data.get("timezone", "UTC"),
        }

        return JsonResponse({"status": "success", "access": access, "user": response_user}, status=200)

    except Exception as e:
        return JsonResponse({"status": "error", "message": str(e)}, status=400)


# ---------------- Logout ----------------
@csrf_exempt
@require_POST
def logout_user(request):
    try:
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            return JsonResponse({"status": "error", "message": "Unauthorized"}, status=401)

        token = auth_header.split(" ")[1]
        payload = decode_jwt(token)
        if not payload:
            return JsonResponse({"status": "error", "message": "Invalid token"}, status=401)

        return JsonResponse({"status": "success", "message": "Logged out"}, status=200)

    except Exception as e:
        return JsonResponse({"status": "error", "message": str(e)}, status=500)


# ---------------- Google OAuth2 ----------------
class GoogleOAuth2CompleteView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        if not request.user.is_authenticated:
            return JsonResponse({"error": "Google authentication failed"}, status=400)

        try:
            social_user = request.user.social_auth.get(provider="google-oauth2")
            user_profile = social_user.extra_data
        except Exception:
            return JsonResponse({"error": "Could not fetch Google profile"}, status=500)

        user = get_or_create_user_oauth(user_profile)
        access_token = generate_jwt(str(user.id), user.username, user.email)
        redirect_url = f"{settings.FRONTEND_URL}/oauth?token={access_token}"
        return redirect(redirect_url)


# ----- TODO: I'll implement Google OAuth Later -----

# ---------------- Mobile Google Login ----------------
# @csrf_exempt
# def mobile_google_login(request):
#     if request.method != "POST":
#         return JsonResponse({"status": "error", "message": "POST required"}, status=405)

#     try:
#         data = json.loads(request.body)
#         token = data.get("id_token")
#         idinfo = id_token.verify_oauth2_token(token, google_requests.Request(), os.environ["CLIENT_ID_ANDROID"])
#         email = idinfo["email"]
#         username = email.split("@")[0]

#         user = users.find_one({"email": email})
#         if not user:
#             users.insert_one({"username": username, "email": email, "created_at": timezone.now()})

#         return JsonResponse({"status": "success", "username": username, "email": email})
#     except ValueError:
#         return JsonResponse({"status": "error", "message": "Invalid token"}, status=400)
