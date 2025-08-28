import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from datetime import datetime
import jwt
from django.conf import settings

def convert_dates(obj):
    """
    Recursively convert datetime objects to ISO format in dicts.
    """
    if isinstance(obj, dict):
        return {k: convert_dates(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [convert_dates(i) for i in obj]
    elif isinstance(obj, datetime):
        return obj.isoformat()
    else:
        return obj

class ProfileConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        # Get token from query string
        token = self.scope.get("query_string").decode().split("token=")[-1]
        
        if not token:
            await self.close()
            return
        
        try:
            # Verify JWT token
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
            user_id = payload.get("user_id")
            
            if not user_id:
                await self.close()
                return
                
            self.user_id = user_id
            self.group_name = f"user_{user_id}"
            
            await self.channel_layer.group_add(self.group_name, self.channel_name)
            await self.accept()
            
        except jwt.ExpiredSignatureError:
            await self.close(code=4001)  # Custom code for expired token
        except jwt.InvalidTokenError:
            await self.close(code=4001)  # Custom code for invalid token
        except Exception as e:
            await self.close()

    async def disconnect(self, close_code):
        if hasattr(self, "group_name"):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def profile_update(self, event):
        user_data = convert_dates(event["user"])
        await self.send(text_data=json.dumps({
            "type": "profile_update",
            "user": user_data
        }))