# backend/users/auth.py
from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.authentication import JWTAuthentication


class OneDeviceTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Adds the user's current session_key to the JWT as 'sid'.
    We'll rotate session_key on each login in the next step.
    """
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        # Bind token to the user's current rotating session key
        token["sid"] = str(user.session_key)
        return token


class SessionBoundJWTAuthentication(JWTAuthentication):
    """
    Rejects any token whose 'sid' doesn't match the user's current session_key.
    This makes older devices' tokens immediately invalid after a new login.
    """
    def get_user(self, validated_token):
        user = super().get_user(validated_token)
        sid = validated_token.get("sid")
        if not sid or str(user.session_key) != str(sid):
            # Simple, consistent error text/code for frontend to detect
            raise AuthenticationFailed("Session expired", code="session_invalid")
        return user
