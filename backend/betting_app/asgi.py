# backend/betting_app/asgi.py
"""
ASGI entrypoint with Django Channels + SimpleJWT auth for WebSockets.
- Reads JWT from ?token=... or Authorization: Bearer ...
- Validates the token AND checks 'sid' against User.session_key
- Exposes /ws/profile/ and /ws/rounds/ routes
"""
import os
from urllib.parse import parse_qs

# 1) Configure settings FIRST
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "betting_app.settings")

# 2) Set up Django BEFORE importing anything that touches models/settings
import django
django.setup()

# 3) Now it's safe to import Django/Channels things
from django.core.asgi import get_asgi_application
from django.contrib.auth.models import AnonymousUser
from django.contrib.auth import get_user_model
from django.urls import path

from channels.routing import ProtocolTypeRouter, URLRouter
from channels.security.websocket import AllowedHostsOriginValidator
from channels.db import database_sync_to_async

from rest_framework_simplejwt.authentication import JWTAuthentication

# 4) Get the WSGI/HTTP app
django_asgi_app = get_asgi_application()
User = get_user_model()

# ---- SimpleJWT WS middleware (with 'sid' check) ----
class SimpleJWTAuthMiddleware:
    """
    Sets scope['user'] if a valid JWT is provided AND its 'sid' matches the
    user's current session_key. Otherwise leaves AnonymousUser.
    """
    def __init__(self, inner):
        self.inner = inner
        self.jwt_auth = JWTAuthentication()

    async def __call__(self, scope, receive, send):
        user = AnonymousUser()
        token = None

        # 1) Try ?token=...
        try:
            qs = parse_qs((scope.get("query_string") or b"").decode())
            token = (qs.get("token") or [None])[0]
        except Exception:
            token = None

        # 2) Try Authorization: Bearer ...
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
                user = await _get_user_if_sid_matches(validated)
            except Exception:
                user = AnonymousUser()

        scope["user"] = user
        return await self.inner(scope, receive, send)


@database_sync_to_async
def _get_user_if_sid_matches(validated_token):
    """
    Return the authenticated user only if the token's 'sid' matches the
    user's current session_key (enforces one-device policy for WS too).
    """
    uid = validated_token.get("user_id") or validated_token.get("sub")
    sid = validated_token.get("sid")
    if not uid or not sid:
        return AnonymousUser()

    try:
        user = User.objects.get(id=uid)
    except User.DoesNotExist:
        return AnonymousUser()

    if str(user.session_key) != str(sid):
        return AnonymousUser()

    return user


def JWTAuthMiddlewareStack(inner):
    return SimpleJWTAuthMiddleware(inner)


# 5) Import consumers AFTER setup, and from the right module
from bets.consumers import UserProfileConsumer, RoundConsumer  # <- consumers.py

application = ProtocolTypeRouter(
    {
        "http": django_asgi_app,
        "websocket": AllowedHostsOriginValidator(
            JWTAuthMiddlewareStack(
                URLRouter(
                    [
                        path("ws/profile/", UserProfileConsumer.as_asgi()),
                        path("ws/rounds/", RoundConsumer.as_asgi()),
                    ]
                )
            )
        ),
    }
)
