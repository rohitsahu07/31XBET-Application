# backend/bets/views.py
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from channels.db import database_sync_to_async
from decimal import Decimal, InvalidOperation
import time
from threading import Timer

from django.db import transaction, models, close_old_connections
from django.db.models import F
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from rest_framework.response import Response

from .models import Bet, Round
from users.models import User
from .engine import (
    CURRENT_ROUND,
    _LOCK,
    FLIPPED,
    new_round_state,
    calc_cycle,
    reveal_step,
    mask_cards_for_step,
)

MIN_STAKE = Decimal("100")
MAX_STAKE = Decimal("10000")

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

    # If engine already has official result, persist winner/ended_at (for visuals/history)
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
            a_cards, b_cards = [FLIPPED] * 3, [FLIPPED] * 3
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
# Deferred settlement helper (credit after delay)
# ─────────────────────────────────────────────
def _settle_bet_after_delay(
    bet_id: int,
    user_id: int,
    round_db_id: int,
    round_public_id: str,
    selection: str,
    delay_seconds: int,
):
    """
    After delay_seconds:
      - Set Round.winner (if blank) to selection
      - Mark Bet as WON with payout=2x
      - Credit user's balance
      - Broadcast profile_update
      - Print timestamps
    """
    def _run():
        # ensure good DB conn handling in background thread
        close_old_connections()
        try:
            print(
                f"[credit:start] t={timezone.now().strftime('%Y-%m-%d %H:%M:%S')}  "
                f"bet_id={bet_id} user_id={user_id} delay={delay_seconds}s"
            )

            now_dt = timezone.now()

            with transaction.atomic():
                # Lock & update round winner if still empty
                r = Round.objects.select_for_update().filter(id=round_db_id).first()
                if r and not r.winner:
                    r.winner = selection
                    r.ended_at = now_dt
                    r.save(update_fields=["winner", "ended_at"])

                # Lock bet, settle if still PLACED
                bet = (
                    Bet.objects.select_for_update()
                    .select_related("user", "round")
                    .filter(id=bet_id)
                    .first()
                )
                if not bet:
                    print(f"[credit:skip] bet_id={bet_id} not found")
                    return
                if bet.status != "PLACED":
                    print(f"[credit:skip] bet_id={bet_id} already settled ({bet.status})")
                    return

                payout = (bet.stake * Decimal("2.00")).quantize(Decimal("0.01"))
                net = (payout - bet.stake).quantize(Decimal("0.01"))

                bet.status = "WON"
                bet.payout = payout
                bet.net = net
                bet.settled_at = now_dt
                bet.save(update_fields=["status", "payout", "net", "settled_at"])

                # Credit payout
                User.objects.filter(id=user_id).update(balance=F("balance") + payout)

            # WS update (chips/expo)
            broadcast_user_profile(user_id)

            print(
                f"[credit:done ] t={timezone.now().strftime('%Y-%m-%d %H:%M:%S')}  "
                f"bet_id={bet_id} user_id={user_id}"
            )
        except Exception as e:
            print(f"[credit:error] bet_id={bet_id} user_id={user_id} err={e}")
        finally:
            close_old_connections()

    Timer(delay_seconds, _run).start()


# ─────────────────────────────────────────────
# Place Bet — deduct now, credit after bet_left + 10s
# ─────────────────────────────────────────────
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def place_bet(request):
    """
    Client may send: bet_seconds_left (int)
    Credit delay = min(client_bet_left, server_bet_left) + 10 (reveal)
    """
    try:
        round_id = request.data.get("round_id")
        player = request.data.get("player")
        amount_raw = request.data.get("amount")
        client_bet_left_raw = request.data.get("bet_seconds_left")
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

            # avoid cross-round posting
            if str(CURRENT_ROUND["round_id"]) != str(round_id):
                return Response({"error": "Round mismatch"}, status=400)

            sec, phase, server_seconds_left = calc_cycle(now)
            if phase != "bet":
                return Response({"error": "Bet window closed"}, status=400)

        # stake bounds
        if amount < MIN_STAKE:
            return Response({"error": "Bet should be greater than 100"}, status=400)
        if amount > MAX_STAKE:
            return Response({"error": "Bet should be less than 10000"}, status=400)

        # funds
        if user.balance < amount:
            return Response({"error": "Insufficient balance"}, status=400)

        # resolve bet-left seconds
        def _to_int(v, default=None):
            try:
                iv = int(v)
                return iv
            except Exception:
                return default

        client_left = _to_int(client_bet_left_raw, None)
        if client_left is None or client_left < 0 or client_left > 120:
            bet_left = server_seconds_left
            src = "server"
        else:
            bet_left = min(max(client_left, 0), server_seconds_left)
            src = "min(client,server)"

        REVEAL_SECONDS = 10
        delay_seconds = max(int(bet_left) + REVEAL_SECONDS, 1)

        # ensure Round row exists
        round_row = _ensure_round_from_engine(CURRENT_ROUND)

        # print: deduct start
        print(
            f"[deduct:start] t={timezone.now().strftime('%Y-%m-%d %H:%M:%S')}  "
            f"user={user.username}({user.id}) amount={amount} round={round_id} sel={player} "
            f"bet_left={bet_left}s(src={src}) reveal=10s delay={delay_seconds}s"
        )

        with transaction.atomic():
            # debit
            User.objects.filter(id=user.id).update(balance=F("balance") - amount)
            user.refresh_from_db(fields=["balance"])

            # create PLACED bet
            bet = Bet.objects.create(
                user=user,
                round=round_row,
                selection=player,
                stake=amount,
                status="PLACED",
            )

        # print: deduct done
        print(
            f"[deduct:done ] t={timezone.now().strftime('%Y-%m-%d %H:%M:%S')}  "
            f"user={user.username}({user.id}) new_balance={user.balance}"
        )

        # immediate WS update (balance/expo)
        broadcast_user_profile(user.id)

        # schedule settlement
        _settle_bet_after_delay(
            bet_id=bet.id,
            user_id=user.id,
            round_db_id=round_row.id,
            round_public_id=round_row.round_id,
            selection=player,
            delay_seconds=delay_seconds,
        )

        return Response(
            {
                "message": f"Bet placed. Stake deducted now; win will be credited after {delay_seconds}s.",
                "round_id": round_id,
                "player": player,
                "bet_amount": str(amount),
                "delay_seconds": delay_seconds,
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
            "final_result": it["winner"],
            "official_winner": it["winner"],
            "created_at": it["created_at"],
        })
    return Response({"items": formatted}, status=200)


# ─────────────────────────────────────────────
# WebSocket: profile broadcast + consumers
# ─────────────────────────────────────────────
def _compute_profile_snapshot(user_id: int):
    """
    Returns dict with current balance and open exposure (current round PLACED bets).
    Mirrors your /profile logic so UI shows same numbers.
    """
    from django.db.models import Sum  # local import to avoid circulars
    from decimal import Decimal

    global CURRENT_ROUND
    current_round_id = CURRENT_ROUND["round_id"] if CURRENT_ROUND else None

    try:
        u = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return {"balance": "0.00", "expo": "0.00", "is_admin": False}

    if u.is_superuser:
        return {"balance": "∞", "expo": "∞", "is_admin": True}

    expo_qs = Bet.objects.filter(
        user_id=user_id,
        status="PLACED",
        round__round_id=str(current_round_id) if current_round_id else None,
    )
    expo = expo_qs.aggregate(total=Sum("stake"))["total"] or Decimal("0.00")

    return {
        "balance": f"{u.balance:.2f}",
        "expo": f"{expo:.2f}",
        "is_admin": False,
    }


def broadcast_user_profile(user_id: int):
    """
    Send a live 'profile_update' to the user's personal WS group.
    Call this after any balance/exposure change.
    """
    data = _compute_profile_snapshot(user_id)
    channel_layer = get_channel_layer()
    async_to_sync(channel_layer.group_send)(
        f"user_{user_id}",
        {"type": "profile_update", "data": data},
    )


class UserProfileConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        user = self.scope.get("user")
        if not user or not user.is_authenticated:
            await self.close(code=4401)
            return
        self.user_id = user.id
        self.group_name = f"user_{self.user_id}"

        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()
        # DEBUG:
        await self.send_json({"type": "debug", "msg": f"joined {self.group_name}"})

        data = await database_sync_to_async(_compute_profile_snapshot)(self.user_id)
        await self.send_json({"type": "profile_update", **data})

    async def disconnect(self, code):
        if hasattr(self, "group_name"):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive_json(self, content, **kwargs):
        pass

    async def profile_update(self, event):
        await self.send_json({"type": "profile_update", **event["data"]})

    # ✅ handles "force.logout" (dot) which maps to force_logout
    async def force_logout(self, event):
        await self.send_json({"type": "force_logout", **(event.get("data") or {})})
        await self.close(code=4403)


class RoundConsumer(AsyncJsonWebsocketConsumer):
    """
    Optional global channel if you want to broadcast round ticks.
    Join group 'rounds' and use group_send(..., {'type':'round_update', 'data': {...}})
    """
    group_name = "rounds"

    async def connect(self):
        user = self.scope.get("user")
        if not user or not user.is_authenticated:
            await self.close(code=4401)
            return
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, code):
        await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive_json(self, content, **kwargs):
        pass

    async def round_update(self, event):
        await self.send_json({"type": "round_update", **event["data"]})
