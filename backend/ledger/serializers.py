# backend/ledger/serializers.py
from rest_framework import serializers
from .models import Transaction

class TransactionSerializer(serializers.ModelSerializer):
    to_username = serializers.SerializerMethodField(read_only=True)
    from_username = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Transaction
        fields = [
            'id', 'from_user', 'to_user', 'from_username', 'to_username',
            'amount', 'type', 'timestamp', 'description',
            'prev_balance', 'credit', 'debit', 'balance'
        ]
        read_only_fields = ['id', 'timestamp', 'prev_balance', 'credit', 'debit', 'balance']

    def get_to_username(self, obj):
        return obj.to_user.username if obj.to_user else None

    def get_from_username(self, obj):
        return obj.from_user.username if obj.from_user else None
