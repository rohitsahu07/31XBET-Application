import requests
from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.conf import settings
from django.db import transaction
from celery import shared_task
from .models import Game, Bet
from .serializers import GameSerializer, BetSerializer
from ledger.models import Transaction
import os

CRICKET_API_BASE = 'https://api.cricketdata.org/v1/'
CRICKET_API_KEY = os.getenv('CRICKET_API_KEY')

class GamePermission(IsAuthenticated):
    def has_permission(self, request, view):
        return True  # All can view games

class GameViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Game.objects.all()
    serializer_class = GameSerializer
    permission_classes = [GamePermission]

    def list(self, request):
        # Fetch and update live cricket games
        try:
            response = requests.get(f"{CRICKET_API_BASE}matches?apikey={CRICKET_API_KEY}")
            if response.status_code == 200:
                data = response.json().get('data', [])
                for match in data[:10]:  # Limit for speed
                    Game.objects.update_or_create(
                        name=match.get('name', 'Unknown'),
                        defaults={'type': 'cricket', 'status': match.get('status', 'upcoming'), 'metadata': match}
                    )
        except Exception as e:
            pass  # Fail silently if API down
        return super().list(request)

class BetPermission(IsAuthenticated):
    def has_permission(self, request, view):
        return request.user.role == 'client'

class BetViewSet(viewsets.ModelViewSet):
    serializer_class = BetSerializer
    permission_classes = [BetPermission]

    def get_queryset(self):
        return Bet.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        user = self.request.user
        amount = serializer.validated_data['amount']
        if user.balance < amount:
            raise serializers.ValidationError("Insufficient balance")
        with transaction.atomic():
            user.balance -= amount
            user.save()
            bet = serializer.save(user=user)
            Transaction.objects.create(from_user=user, to_user=None, amount=amount, type='bet', description=f'Bet on {bet.game.name}')
        if bet.game.type == 'casino':
            settle_casino_bet.delay(bet.id)  # Async for speed

@shared_task
def settle_casino_bet(bet_id):
    from random import random
    bet = Bet.objects.get(id=bet_id)
    if random() > 0.5:  # Simulate 50% win
        outcome = bet.amount * 2
        bet.status = 'won'
        bet.user.balance += outcome
        Transaction.objects.create(to_user=bet.user, amount=outcome, type='win', description=f'Win on {bet.game.name}')
    else:
        outcome = 0
        bet.status = 'lost'
        Transaction.objects.create(to_user=bet.user, amount=0, type='loss', description=f'Loss on {bet.game.name}')
    bet.outcome = outcome
    bet.save()
    bet.user.save()