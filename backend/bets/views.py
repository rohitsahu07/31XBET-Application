# backend/bets/views.py

from decimal import Decimal, InvalidOperation
import random, time
from django.db import transaction, models
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from rest_framework.response import Response

from .models import Bet, Round
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

def _ensure_round_from_engine(engine_obj) -> Round:
    """
    Ensure a Round row exists/updated from CURRENT_ROUND engine dict.
    We do NOT set winner here (engine reveals winner later).
    """
    if not engine_obj:
        raise ValueError("Engine round not initialized")

    round_id = str(engine_obj["round_id"])
    defaults = {
        "game": "tpt20",
        "started_at": _ts_to_dt(engine_obj["start_time"]) if engine_obj.get("start_time") else None,
        "player_a_cards": engine_obj.get("player_a_full") or None,
        "player_b_cards": engine_obj.get("player_b_full") or None,
    }
    # get or create
    r, _ = Round.objects.get_or_create(round_id=round_id, defaults=defaults)

    # best-effort sync (non-destructive)
    changed = False
    if defaults["started_at"] and not r.started_at:
        r.started_at = defaults["started_at"]; changed = True
    if defaults["player_a_cards"] and not r.player_a_cards:
        r.player_a_cards = defaults["player_a_cards"]; changed = True
    if defaults["player_b_cards"] and not r.player_b_cards:
        r.player_b_cards = defaults["player_b_cards"]; changed = True

    # If engine already has official result, persist winner/ended_at
    if engine_obj.get("official_result") and not r.winner:
        r.winner = engine_obj["official_result"]; changed = True
        r.ended_at = timezone.now(); changed = True

    if changed:
        r.save(update_fields=["started_at", "player_a_cards", "player_b_cards", "winner", "ended_at"])
    return r


# ─────────────────────────────────────────────
# Profile (balance + expo)
# ─────────────────────────────────────────────
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def profile(request):
    user: User = request.user
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

    # Bet model: open = status=PLACED; filter via related round.round_id
    open_bets = Bet.objects.filter(
        user=user,
        status="PLACED",
        round__round_id=str(current_round_id) if current_round_id else None,
    )
    expo_sum = open_bets.aggregate(total=models.Sum("stake"))["total"] or Decimal("0.00")

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
        user: User = request.user

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

            # hard sync round ids to avoid cross-round post
            if str(CURRENT_ROUND["round_id"]) != str(round_id):
                return Response({"error": "Round mismatch"}, status=400)

            sec, phase, _ = calc_cycle(now)
            if phase != "bet":
                return Response({"error": "Bet window closed"}, status=400)

            # check balance
            if user.balance < amount:
                return Response({"error": "Insufficient balance"}, status=400)

            # biased result selection (preserve your original weights)
            result = (
                random.choices(["A", "B"], weights=[3, 7])[0]
                if player == "A"
                else random.choices(["A", "B"], weights=[7, 3])[0]
            )

            # Make sure a Round row exists (no winner set during bet phase)
            round_row = _ensure_round_from_engine(CURRENT_ROUND)

            with transaction.atomic():
                # Deduct chips (🟢 no Transaction row for stake)
                prev_bal = user.balance
                new_bal = prev_bal - amount
                user.balance = new_bal
                user.save(update_fields=["balance"])

                # Bet row (open/placed)
                Bet.objects.create(
                    user=user,
                    round=round_row,
                    selection=player,
                    stake=amount,
                    status="PLACED",
                )

        # SAME RESPONSE SHAPE
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
    """
    Return the last 10 finished rounds for the frontend history display.
    We now read from Round (winner set when engine finalizes).
    Response SHAPE is preserved:
      {"items": [{"round_id": "...", "final_result": "A/B", "official_winner": "A/B", "created_at": ...}, ...]}
    """
    items_qs = (
        Round.objects.filter(winner__isnull=False)
        .order_by("-created_at")
        .values("round_id", "winner", "created_at")[:10]
    )

    formatted = []
    for it in items_qs:
        formatted.append({
            "round_id": it["round_id"],
            "final_result": it["winner"],         # mirror the previous behavior
            "official_winner": it["winner"],      # (we used to store both; now winner is official)
            "created_at": it["created_at"],
        })
    return Response({"items": formatted}, status=200)
