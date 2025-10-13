# backend/users/serializers.py
from rest_framework import serializers
from django.contrib.auth import get_user_model

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    is_self = serializers.SerializerMethodField()
    balance = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "is_superuser",
            "is_self",
            "balance",
        ]
        read_only_fields = ["id", "is_superuser", "balance"]

    def get_is_self(self, obj):
        request = self.context.get("request", None)
        if not request or not hasattr(request, "user") or request.user.is_anonymous:
            return False
        return bool(obj.id == request.user.id)
