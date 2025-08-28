import os

# Set settings module first
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'main.settings')

# Setup Django
import django
django.setup()

# imports
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from main.jwt_middleware import JWTAuthMiddleware
from command.routing import websocket_patterns as voice_ws
from user.routing import websocket_urlpatterns as user_ws

# Get the ASGI application
django_asgi_app = get_asgi_application()

websocket_routes = [
    *voice_ws,
    *user_ws,
]

application = ProtocolTypeRouter({
    "http": django_asgi_app,
    "websocket": JWTAuthMiddleware(
        URLRouter(websocket_routes)
    ),
})
