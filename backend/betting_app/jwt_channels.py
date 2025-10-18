# backend/betting_app/jwt_channels.py
from urllib.parse import parse_qs
from channels.db import database_sync_to_async
from channels.middleware import BaseMiddleware
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import UntypedToken
from rest_framework_simplejwt.authentication import JWTAuthentication
from django.db import close_old_connections

User = get_user_model()

class JWTAuthMiddleware(BaseMiddleware):
    """
    Reads ?token=... from the websocket URL and sets scope['user'].
    Rejects if token invalid or session sid stale (your DRF auth will catch API calls too).
    """

    async def __call__(self, scope, receive, send):
        # default anonymous
        scope["user"] = None

        try:
            query_string = scope.get("query_string", b"").decode()
            token = parse_qs(query_string).get("token", [None])[0]

            if token:
                # Validate token (raises if invalid)
                UntypedToken(token)
                user = await self._get_user_from_token(token)
                scope["user"] = user
        except Exception:
            # leave as anonymous
            scope["user"] = None
        close_old_connections()
        return await super().__call__(scope, receive, send)

    @database_sync_to_async
    def _get_user_from_token(self, token):
        # Reuse DRF's JWTAuthentication logic to resolve user
        authenticator = JWTAuthentication()
        validated = authenticator.get_validated_token(token)
        return authenticator.get_user(validated)
