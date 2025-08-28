from urllib.parse import parse_qs
from django.contrib.auth.models import AnonymousUser
from config.token import decode_jwt
from channels.middleware import BaseMiddleware

class JWTAuthMiddleware(BaseMiddleware):
    """
    Custom middleware for JWT over WebSocket query params.
    Extends Channels BaseMiddleware to handle ASGI properly.
    """

    async def __call__(self, scope, receive, send):
        # Extract token from query params
        query_string = scope.get("query_string", b"").decode()
        query_params = parse_qs(query_string)
        token = query_params.get("token", [None])[0]

        if token:
            decoded = decode_jwt(token)
            if decoded:
                scope["user_id"] = decoded.get("user_id")
                scope["user"] = decoded
            else:
                scope["user"] = AnonymousUser()
        else:
            scope["user"] = AnonymousUser()

        return await super().__call__(scope, receive, send)
