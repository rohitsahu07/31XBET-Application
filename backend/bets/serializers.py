# backend/bets/serializers.py (updated for details field in bets)

from rest_framework import serializers
from .models import Game, Bet

class GameSerializer(serializers.ModelSerializer):
    class Meta:
        model = Game
        fields = '__all__'

class BetSerializer(serializers.ModelSerializer):
    class Meta:
        model = Bet
        fields = '__all__'
        extra_kwargs = {'user': {'read_only': True}}

    def validate(self, data):
        # Ensure details has team for cricket bets
        if data['game'].type == 'cricket' and 'team_bet_on' not in data.get('details', {}):
            raise serializers.ValidationError("For cricket bets, specify 'team_bet_on' in details (e.g., 't1' or 't2')")
        return data