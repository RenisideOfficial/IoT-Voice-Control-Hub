from django.urls import re_path
from .consumer import SpeechConsumer

websocket_patterns = [
    re_path(r"ws/speech/$", SpeechConsumer.as_asgi())
]