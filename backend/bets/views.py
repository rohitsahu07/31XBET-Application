# backend/bets/views.py (API fetch removed; handled in frontend)

import random
from rest_framework import viewsets, serializers
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db import transaction
from celery import shared_task
from .models import Game, Bet
from .serializers import GameSerializer, BetSerializer
from ledger.models import Transaction


class GameViewSet(viewsets.ReadOnlyModelViewSet):
    """Read-only viewset for listing stored games."""
    queryset = Game.objects.all()
    serializer_class = GameSerializer
    permission_classes = [IsAuthenticated]

    def list(self, request):
        # Just return stored games (frontend handles fetching new API data)
        return super().list(request)


class BetViewSet(viewsets.ModelViewSet):
    """Viewset for creating and viewing bets."""
    serializer_class = BetSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Bet.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        user = self.request.user
        amount = serializer.validated_data['amount']

        if user.balance < amount:
            raise serializers.ValidationError("Insufficient balance")

        with transaction.atomic():
            # Deduct balance
            user.balance -= amount
            user.save()

            # Save bet
            bet = serializer.save(user=user)

            # Record transaction
            Transaction.objects.create(
                from_user=user,
                to_user=None,
                amount=amount,
                type='bet',
                description=f'Bet on {bet.game.name}'
            )

        # Trigger async settlement for casino bets
        if bet.game.type == 'casino':
            settle_casino_bet.delay(bet.id)


@shared_task
def settle_casino_bet(bet_id):
    """Simulate casino bet settlement with 50% win chance."""
    bet = Bet.objects.get(id=bet_id)

    if random.random() > 0.5:  # Win
        outcome = bet.amount * 2
        bet.status = 'won'
        bet.user.balance += outcome
        Transaction.objects.create(
            to_user=bet.user,
            amount=outcome,
            type='win',
            description=f'Win on {bet.game.name}'
        )
    else:  # Loss
        outcome = 0
        bet.status = 'lost'
        Transaction.objects.create(
            to_user=bet.user,
            amount=0,
            type='loss',
            description=f'Loss on {bet.game.name}'
        )

    bet.outcome = outcome
    bet.save()
    bet.user.save()
