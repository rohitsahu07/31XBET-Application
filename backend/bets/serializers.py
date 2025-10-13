# backend/bets/serializers.py
from rest_framework import serializers
from .models import Round, Bet


class RoundSerializer(serializers.ModelSerializer):
    class Meta:
        model = Round
        fields = "__all__"


class BetSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source="user.username", read_only=True)
    round_info = serializers.CharField(source="round.title_str", read_only=True)
    won_by = serializers.CharField(source="won_by_label", read_only=True)
    description = serializers.CharField(source="description_for_ledger", read_only=True)

    class Meta:
        model = Bet
        fields = [
            "id", "user", "user_name", "round", "round_info",
            "selection", "stake", "status", "payout", "net",
            "won_by", "description", "created_at", "settled_at"
        ]
