from rest_framework import serializers
from django.contrib.auth import get_user_model

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    is_self = serializers.SerializerMethodField()
    balance = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)  # ✅ Add this

    class Meta:
        model = User
        fields = [
            'id',
            'username',
            'is_superuser',
            'is_self',
            'balance',  # ✅ Include balance here
        ]

    def get_is_self(self, obj):
        request = self.context.get('request')
        return request and request.user and obj.id == request.user.id
