from rest_framework import serializers
from .models import Transaction

class TransactionSerializer(serializers.ModelSerializer):
    to_username = serializers.CharField(source='to_user.username', read_only=True)
    from_username = serializers.CharField(source='from_user.username', read_only=True)

    class Meta:
        model = Transaction
        fields = [
            'id', 'from_user', 'to_user', 'from_username', 'to_username',
            'amount', 'type', 'timestamp', 'description',
            'prev_balance', 'credit', 'debit', 'balance'
        ]
        read_only_fields = ['id', 'timestamp', 'prev_balance', 'credit', 'debit', 'balance']
