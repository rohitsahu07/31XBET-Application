# backend/bets/views.py (updated to handle cricket bets, add settlement task)

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

load_dotenv()

CRICKET_API_BASE = os.getenv('CRICKET_API_BASE', 'https://api.cricapi.com/v1/')
CRICKET_API_KEY = os.getenv('CRICKET_API_KEY')

class GameViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Game.objects.all()
    serializer_class = GameSerializer
    permission_classes = [IsAuthenticated]

    def list(self, request):
        # Existing code for fetching and categorizing...
        try:
            response = requests.get(f"{CRICKET_API_BASE}cricScore?apikey={CRICKET_API_KEY}")
            if response.status_code == 200:
                data = response.json().get('data', [])
                upcoming = [m for m in data if m.get('ms', '').lower() == 'match not started' or m.get('status', '').lower() == 'upcoming']
                ongoing = [m for m in data if m.get('ms', '').lower() == 'live' or m.get('status', '').lower() == 'live']
                completed = [m for m in data if m.get('ms', '').lower() == 'result' or m.get('status', '').lower() == 'completed']

                print(f"Number of Upcoming Matches: {len(upcoming)}")
                print(f"Number of Ongoing Matches: {len(ongoing)}")
                print(f"Number of Completed Matches: {len(completed)}")

                # print("\n===== Upcoming Matches =====")
                # for m in upcoming:
                #     print(f"Teams: {m.get('t1', 'N/A')} vs {m.get('t2', 'N/A')} | Date: {m.get('dateTimeGMT', 'N/A')} | Series: {m.get('series', 'N/A')}")

                # print("\n===== Ongoing Matches =====")
                # for m in ongoing:
                #     print(f"Teams: {m.get('t1', 'N/A')} Score: {m.get('t1s', 'N/A')} vs {m.get('t2', 'N/A')} Score: {m.get('t2s', 'N/A')} | Series: {m.get('series', 'N/A')}")

                # print("\n===== Completed Matches =====")
                # for m in completed:
                #     print(f"Teams: {m.get('t1', 'N/A')} Score: {m.get('t1s', 'N/A')} vs {m.get('t2', 'N/A')} Score: {m.get('t2s', 'N/A')} | Winner/Result: {m.get('status', 'N/A')} | Series: {m.get('series', 'N/A')}")

                for match in data:
                    status = match.get('status', 'upcoming').lower()
                    if status not in ['upcoming', 'live', 'ended']:
                        status = 'upcoming'
                    Game.objects.update_or_create(
                        name=match.get('name', 'Unknown Match'),
                        defaults={
                            'type': 'cricket',
                            'status': status,
                            'metadata': match
                        }
                    )
            else:
                print(f"API Error: Status {response.status_code} - {response.text}")
        except Exception as e:
            print(f"Error fetching matches: {e}")

        return super().list(request)

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