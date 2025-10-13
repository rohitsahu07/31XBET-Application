# bets/views.py
import time
import random
from decimal import Decimal, InvalidOperation

from django.db import transaction
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import BetRecord, RoundFeed
from .serializers import BetRecordSerializer

# Engine state + helpers
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

# ─────────────────────────────────────────────────────────────────────────────
# small helpers
# ─────────────────────────────────────────────────────────────────────────────
def _ts_to_dt(ts: int):
    return timezone.make_aware(
        timezone.datetime.fromtimestamp(int(ts)),
        timezone.get_current_timezone(),
    )

def _trim_feed(limit: int = 10):
    ids = list(RoundFeed.objects.order_by("-created_at").values_list("id", flat=True)[:limit])
    if ids:
        RoundFeed.objects.exclude(id__in=ids).delete()


# ─────────────────────────────────────────────────────────────────────────────
# /api/bets/profile/
# ─────────────────────────────────────────────────────────────────────────────
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def profile(request):
    user = request.user
    is_admin = bool(getattr(user, "is_superuser", False))
    if is_admin:
        balance_str = "∞"
        expo_str = "∞"
    else:
        bal = getattr(user, "balance", 0)
        try:
            balance_str = f"{float(bal):.2f}"
        except Exception:
            balance_str = str(bal)
        expo_str = "0.00"

    return Response(
        {
            "id": user.id,
            "username": getattr(user, "username", ""),
            "is_admin": is_admin,
            "balance": balance_str,
            "chips": balance_str,
            "expo": expo_str,
        },
        status=status.HTTP_200_OK,
    )


# ─────────────────────────────────────────────────────────────────────────────
# /api/bets/current-round/
# ─────────────────────────────────────────────────────────────────────────────
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
            a_cards = [FLIPPED, FLIPPED, FLIPPED]
            b_cards = [FLIPPED, FLIPPED, FLIPPED]
            result = None
            a_full = None
            b_full = None
        else:
            a_cards = mask_cards_for_step(CURRENT_ROUND["player_a_full"], step, "A")
            b_cards = mask_cards_for_step(CURRENT_ROUND["player_b_full"], step, "B")
            result = CURRENT_ROUND["official_result"] if step == 6 else None
            a_full = CURRENT_ROUND["player_a_full"]
            b_full = CURRENT_ROUND["player_b_full"]

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

    print(
        f"[current-round] phase={phase:<6} sec={sec:>2} step={step} left={seconds_left:>2}s "
        f"round={payload['round_id']} A={pretty(a_cards)} B={pretty(b_cards)} result={result}"
    )
    return Response(payload, status=status.HTTP_200_OK)


# ─────────────────────────────────────────────────────────────────────────────
# /api/bets/place-bet/
# ─────────────────────────────────────────────────────────────────────────────
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def place_bet(request):
    try:
        round_id = request.data.get("round_id")
        player = request.data.get("player")  # "A" | "B"
        amount_raw = request.data.get("amount")

        try:
            amount = Decimal(str(amount_raw))
        except (InvalidOperation, TypeError):
            return Response({"error": "Invalid amount"}, status=400)

        if not round_id or player not in ("A", "B"):
            return Response({"error": "Missing fields"}, status=400)

        user = getattr(request, "user", None)
        print(f"[place-bet] ENTER user={getattr(user, 'username', '?')} (client) round_id={round_id} player={player} amount={amount}")

        now = int(time.time())
        global CURRENT_ROUND

        with _LOCK:
            if CURRENT_ROUND is None:
                CURRENT_ROUND = new_round_state(now)

            sec, phase, _ = calc_cycle(now)

            if phase == "bet":
                # skewed result so it feels “biased” when betting
                result = random.choices(["A", "B"], weights=[3, 7])[0] if player == "A" else random.choices(["A", "B"], weights=[7, 3])[0]
                resolver = "biased"
            else:
                result = CURRENT_ROUND["official_result"]
                resolver = "official"

            # Build safe datetimes right here (no ints leak through)
            start_dt = _ts_to_dt(CURRENT_ROUND["start_time"])
            end_dt = timezone.now()

            with transaction.atomic():
                RoundFeed.objects.create(
                    item_type="BET",
                    round_id=CURRENT_ROUND["round_id"],
                    start_time=start_dt,
                    end_time=end_dt,
                    player_a_cards=CURRENT_ROUND["player_a_full"],
                    player_b_cards=CURRENT_ROUND["player_b_full"],
                    official_winner=CURRENT_ROUND["official_result"],
                    player_choice=player,
                    bet_amount=amount,
                    resolver=resolver,
                    final_result=result,
                )
                # mark the round so the engine doesn't also add an ENGINE item for it
                CURRENT_ROUND["skip_engine_feed"] = True
                _trim_feed(10)

        print(
            f"[place-bet] OK phase={phase:<6} chose={player} amt={amount} "
            f"resolver={resolver:<8} -> result={result}  round={round_id} "
            f"A_full={pretty(CURRENT_ROUND['player_a_full'])}  "
            f"B_full={pretty(CURRENT_ROUND['player_b_full'])}"
        )

        return Response(
            {
                "message": "Bet placed successfully",
                "round_id": round_id,
                "player": player,
                "bet_amount": str(amount),
                "phase": phase,
                "resolver": resolver,
                "final_result": result,
                "server_time": now,
            },
            status=200,
        )

    except Exception as e:
        print(f"[place-bet] ERROR: {e}")
        return Response({"error": "Server error", "detail": str(e)}, status=500)


# ─────────────────────────────────────────────────────────────────────────────
# /api/bets/feed/last-ten/
# ─────────────────────────────────────────────────────────────────────────────
@api_view(["GET"])
def last_ten_feed(request):
    rows = RoundFeed.objects.order_by("-created_at")[:10]
    items = []
    for r in rows:
        items.append(
            {
                "id": r.id,
                "created_at": r.created_at,
                "type": r.item_type,
                "round_id": r.round_id,
                "start_time": r.start_time,
                "end_time": r.end_time,
                "player_a_cards": r.player_a_cards,
                "player_b_cards": r.player_b_cards,
                "official_winner": r.official_winner,
                "player_choice": r.player_choice,
                "bet_amount": str(r.bet_amount) if r.bet_amount is not None else None,
                "resolver": r.resolver,
                "final_result": r.final_result,
            }
        )
    return Response({"items": items}, status=200)
