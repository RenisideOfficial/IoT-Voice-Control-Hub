"""
ASGI config for main project.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/5.2/howto/deployment/asgi/
"""

import os
import django
from django.core.asgi import get_asgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'main.settings')

django.setup()

from channels.routing import ProtocolTypeRouter, URLRouter

# import app websocket patterns
from command.routing import websocket_patterns as voice_ws

django_asgi_app = get_asgi_application()

websocket_routes = [
    *voice_ws
]

# asgi application
application = ProtocolTypeRouter({
    "http": django_asgi_app,
    "websocket": URLRouter(websocket_routes)
})