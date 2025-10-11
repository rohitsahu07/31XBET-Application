from rest_framework import serializers
from .models import BetRecord

class BetRecordSerializer(serializers.ModelSerializer):
    class Meta:
        model = BetRecord
        fields = "__all__"  # ✅ includes won_by, credit, debit, etc.
