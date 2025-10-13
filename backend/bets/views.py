from decimal import Decimal, InvalidOperation
import random, time
from django.db import transaction, models
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from rest_framework.response import Response

from .models import BetRecord, RoundFeed
from ledger.models import Transaction
from users.models import User
from .engine import (
    CURRENT_ROUND,
    _LOCK,
    FLIPPED,
    new_round_state,
    calc_cycle,
    reveal_step,
    mask_cards_for_step,
    pretty,
)

# ─────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────
def _ts_to_dt(ts: int):
    return timezone.make_aware(
        timezone.datetime.fromtimestamp(int(ts)),
        timezone.get_current_timezone(),
    )

def _trim_feed(limit: int = 10):
    ids = list(RoundFeed.objects.order_by("-created_at").values_list("id", flat=True)[:limit])
    if ids:
        RoundFeed.objects.exclude(id__in=ids).delete()

# ─────────────────────────────────────────────
# Profile (balance + expo)
# ─────────────────────────────────────────────
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def profile(request):
    user = request.user
    if user.is_superuser:
        return Response({
            "id": user.id,
            "username": user.username,
            "is_admin": True,
            "balance": "∞",
            "chips": "∞",
            "expo": "∞",
        })

    # calculate open exposure (bets in current round only)
    global CURRENT_ROUND
    current_round_id = CURRENT_ROUND["round_id"] if CURRENT_ROUND else None
    open_bets = BetRecord.objects.filter(user=user, round_id=current_round_id)
    expo_sum = open_bets.aggregate(total=models.Sum("amount"))["total"] or Decimal("0.00")

    return Response({
        "id": user.id,
        "username": user.username,
        "is_admin": False,
        "balance": f"{user.balance:.2f}",
        "chips": f"{user.balance:.2f}",
        "expo": f"{expo_sum:.2f}",
    })

# ─────────────────────────────────────────────
# Current Round
# ─────────────────────────────────────────────
@api_view(["GET"])
def current_round(request):
    now = int(time.time())
    global CURRENT_ROUND
    with _LOCK:
        if CURRENT_ROUND is None:
            CURRENT_ROUND = new_round_state(now)

        sec, phase, seconds_left = calc_cycle(now)
        step = reveal_step(sec)

        if phase == "bet":
            a_cards, b_cards = [FLIPPED]*3, [FLIPPED]*3
            result, a_full, b_full = None, None, None
        else:
            a_cards = mask_cards_for_step(CURRENT_ROUND["player_a_full"], step, "A")
            b_cards = mask_cards_for_step(CURRENT_ROUND["player_b_full"], step, "B")
            result = CURRENT_ROUND["official_result"] if step == 6 else None
            a_full, b_full = CURRENT_ROUND["player_a_full"], CURRENT_ROUND["player_b_full"]

        payload = {
            "round_id": CURRENT_ROUND["round_id"],
            "player_a_cards": a_cards,
            "player_b_cards": b_cards,
            "result": result,
            "phase": phase,
            "seconds_left": seconds_left,
            "reveal_step": step,
            "player_a_full": a_full,
            "player_b_full": b_full,
            "server_time": now,
        }

    return Response(payload, status=status.HTTP_200_OK)

# ─────────────────────────────────────────────
# Place Bet
# ─────────────────────────────────────────────
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def place_bet(request):
    try:
        round_id = request.data.get("round_id")
        player = request.data.get("player")
        amount_raw = request.data.get("amount")
        user = request.user

        try:
            amount = Decimal(str(amount_raw))
        except (InvalidOperation, TypeError):
            return Response({"error": "Invalid amount"}, status=400)

        if not round_id or player not in ("A", "B"):
            return Response({"error": "Missing fields"}, status=400)

        now = int(time.time())
        global CURRENT_ROUND
        with _LOCK:
            if CURRENT_ROUND is None:
                CURRENT_ROUND = new_round_state(now)

            sec, phase, _ = calc_cycle(now)
            if phase != "bet":
                return Response({"error": "Bet window closed"}, status=400)

            # check balance
            if user.balance < amount:
                return Response({"error": "Insufficient balance"}, status=400)

            # biased result selection
            result = (
                random.choices(["A", "B"], weights=[3, 7])[0]
                if player == "A"
                else random.choices(["A", "B"], weights=[7, 3])[0]
            )

            with transaction.atomic():
                # Deduct chips
                prev_bal = user.balance
                new_bal = prev_bal - amount
                user.balance = new_bal
                user.save(update_fields=["balance"])

                # Transaction entry
                Transaction.objects.create(
                    from_user=None,
                    to_user=user,
                    amount=amount,
                    type="bet",
                    description=f"Bet placed on Player {player} (Round {round_id})",
                    prev_balance=prev_bal,
                    debit=amount,
                    credit=Decimal("0.00"),
                    balance=new_bal,
                )

                # Bet record
                BetRecord.objects.create(
                    user=user, round_id=round_id, player=player, amount=amount
                )

                RoundFeed.objects.create(
                    item_type="Place Bet",
                    round_id=round_id,
                    start_time=_ts_to_dt(CURRENT_ROUND["start_time"]),
                    end_time=timezone.now(),
                    player_a_cards=CURRENT_ROUND["player_a_full"],
                    player_b_cards=CURRENT_ROUND["player_b_full"],
                    official_winner=CURRENT_ROUND["official_result"],
                    player_choice=player,
                    bet_amount=amount,
                    resolver="biased",
                    final_result=result,
                )
                _trim_feed(10)

        return Response(
            {
                "message": "Bet placed successfully",
                "round_id": round_id,
                "player": player,
                "bet_amount": str(amount),
                "final_result": result,
            },
            status=200,
        )

    except Exception as e:
        print(f"[place-bet] ERROR: {e}")
        return Response({"error": str(e)}, status=500)

# ─────────────────────────────────────────────
# Last 10 Feed Endpoint (used by frontend)
# ─────────────────────────────────────────────
@api_view(["GET"])
def last_ten_feed(request):
    """Return the last 10 finished rounds for the frontend history display."""
    items = (
        RoundFeed.objects.order_by("-created_at")
        .values("round_id", "final_result", "official_winner", "created_at")[:10]
    )
    formatted = []
    for it in items:
        formatted.append({
            "round_id": it["round_id"],
            "final_result": it["final_result"] or it["official_winner"],
            "created_at": it["created_at"],
        })
    return Response({"items": formatted}, status=200)