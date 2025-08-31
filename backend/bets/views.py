# backend/bets/views.py (updated to handle cricket bets, add settlement task)
from datetime import timezone
import os
import requests
import json
from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db import transaction
from celery import shared_task
from .models import Game, Bet
from .serializers import GameSerializer, BetSerializer
from ledger.models import Transaction
from dotenv import load_dotenv
from rest_framework.views import APIView
from betting_app.cricket_matches import get_cricket_matches

load_dotenv()

CRICKET_API_BASE = os.getenv('CRICKET_API_BASE', 'https://api.cricapi.com/v1/')
CRICKET_API_KEY = os.getenv('CRICKET_API_KEY')

class BetViewSet(viewsets.ModelViewSet):
    serializer_class = BetSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Bet.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        user = self.request.user
        amount = serializer.validated_data['amount']
        game = serializer.validated_data['game']
        if user.balance < amount:
            raise serializers.ValidationError("Insufficient balance")
        if game.status != 'live':
            raise serializers.ValidationError("Bets can only be placed on ongoing matches")
        with transaction.atomic():
            user.balance -= amount
            user.save()
            bet = serializer.save(user=user)
            Transaction.objects.create(from_user=user, to_user=None, amount=amount, type='bet', description=f'Bet on {bet.game.name}')
        # For cricket, settle when match ends
        if game.type == 'cricket':
            settle_cricket_bet.delay(bet.id)

@shared_task
def settle_cricket_bet(bet_id):
    # Logic to fetch outcome from API and settle
    bet = Bet.objects.get(id=bet_id)
    game = bet.game
    # Fetch latest from API (assume match ID in metadata['id'])
    match_id = game.metadata.get('id')
    if match_id:
        try:
            response = requests.get(f"{CRICKET_API_BASE}match_info?apikey={CRICKET_API_KEY}&id={match_id}")
            if response.status_code == 200:
                data = response.json().get('data', {})
                result = data.get('status', '')
                team_bet_on = bet.details.get('team_bet_on')
                winner = 't1' if 't1' in result.lower() else 't2' if 't2' in result.lower() else None
                if winner == team_bet_on:
                    outcome = bet.amount * 2  # Simple odds
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
                game.status = 'ended'
                game.save()
        except Exception as e:
            print(f"Error settling cricket bet: {e}")

@shared_task
def settle_casino_bet(bet_id):
    import random
    bet = Bet.objects.get(id=bet_id)
    if random.random() > 0.5:
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

class CricketMatchesView(APIView):
    permission_classes = []  # Public; set [IsAuthenticated] if auth needed

    def get(self, request):
        matches = get_cricket_matches()
        data = []

        for match in matches:
            dt = match["datetime"]           # datetime object (IST)
            teams = match["teams"]           # list of dicts
            series = match["league"]

            # Convert to UTC (GMT) for frontend
            dt_gmt = dt.astimezone(timezone.utc)
            dateTimeGMT = dt_gmt.isoformat(timespec="seconds")

            t1 = teams[0]["name"] if len(teams) > 0 else ""
            t2 = teams[1]["name"] if len(teams) > 1 else ""

            data.append({
                "t1": t1,
                "t2": t2,
                "matchType": "t20",  # TODO: extract real type if available
                "dateTimeGMT": dateTimeGMT,
                "series": series,
                "ms": "match not started",  # default
                "status": "upcoming",       # default
                "t1s": "N/A",
                "t2s": "N/A",
            })

        return Response({"data": data})