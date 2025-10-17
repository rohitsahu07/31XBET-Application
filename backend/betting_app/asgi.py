"""
ASGI entrypoint with Django Channels + SimpleJWT auth for WebSockets.
"""

import os
from urllib.parse import parse_qs
from django.urls import path

from django.core.asgi import get_asgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "betting_app.settings")

# ✅ Initialize Django settings/apps BEFORE importing auth/models/consumers
django_asgi_app = get_asgi_application()

# Now it's safe to import Django/Channels things that touch settings/models
from django.contrib.auth.models import AnonymousUser
from django.contrib.auth import get_user_model
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.security.websocket import AllowedHostsOriginValidator
from channels.db import database_sync_to_async
from rest_framework_simplejwt.authentication import JWTAuthentication

# ---- SimpleJWT WS middleware ----
class SimpleJWTAuthMiddleware:
    def __init__(self, inner):
        self.inner = inner
        self.jwt_auth = JWTAuthentication()

    async def __call__(self, scope, receive, send):
        user = AnonymousUser()
        token = None

        # ?token=...
        try:
            qs = parse_qs(scope.get("query_string", b"").decode())
            token = qs.get("token", [None])[0]
        except Exception:
            token = None

        # Authorization: Bearer ...
        if not token:
            try:
                headers = dict(scope.get("headers", []))
                auth_header = headers.get(b"authorization", b"").decode()
                if auth_header.lower().startswith("bearer "):
                    token = auth_header.split(" ", 1)[1]
            except Exception:
                token = None

        if token:
            try:
                validated = self.jwt_auth.get_validated_token(token)
                user = await _get_user(validated)
            except Exception:
                user = AnonymousUser()

        scope["user"] = user
        return await self.inner(scope, receive, send)

User = get_user_model()

@database_sync_to_async
def _get_user(validated_token):
    uid = validated_token.get("user_id") or validated_token.get("sub")
    try:
        return User.objects.get(id=uid)
    except User.DoesNotExist:
        return AnonymousUser()

def JWTAuthMiddlewareStack(inner):
    return SimpleJWTAuthMiddleware(inner)

# Import consumers AFTER Django is set up
from bets.views import UserProfileConsumer, RoundConsumer

application = ProtocolTypeRouter({
    "http": django_asgi_app,
    "websocket": AllowedHostsOriginValidator(
        JWTAuthMiddlewareStack(
            URLRouter([
                path("ws/profile/", UserProfileConsumer.as_asgi()),
                path("ws/rounds/", RoundConsumer.as_asgi()),
            ])
        )
    ),
})
