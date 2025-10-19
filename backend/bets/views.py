# backend/bets/views.py
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from channels.db import database_sync_to_async
from decimal import Decimal, InvalidOperation
import time
from threading import Timer

from django.db import transaction, models, close_old_connections
from django.db.models import F, Sum
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from rest_framework.response import Response

from .models import Bet, Round
from users.models import User

# ✅ IMPORTANT: import the module, NOT the globals
from . import engine

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
    if not engine_obj:
        raise ValueError("Engine round not initialized")
    round_id = str(engine_obj["round_id"])
    defaults = {
        "game": "tpt20",
        "started_at": _ts_to_dt(engine_obj["start_time"]) if engine_obj.get("start_time") else None,
        "player_a_cards": engine_obj.get("player_a_full") or None,
        "player_b_cards": engine_obj.get("player_b_full") or None,
    }
    r, _ = Round.objects.get_or_create(round_id=round_id, defaults=defaults)
    changed = False
    if defaults["started_at"] and not r.started_at:
        r.started_at = defaults["started_at"]; changed = True
    if defaults["player_a_cards"] and not r.player_a_cards:
        r.player_a_cards = defaults["player_a_cards"]; changed = True
    if defaults["player_b_cards"] and not r.player_b_cards:
        r.player_b_cards = defaults["player_b_cards"]; changed = True
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
        resp = Response({
            "id": user.id,
            "username": user.username,
            "is_admin": True,
            "balance": "∞",
            "chips": "∞",
            "expo": "∞",
        })
        resp["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
        resp["Pragma"] = "no-cache"
        resp["Vary"] = "Authorization"
        return resp

    current_round_id = None
    with engine._LOCK:
        if engine.CURRENT_ROUND:
            current_round_id = engine.CURRENT_ROUND["round_id"]

    expo_sum = Bet.objects.filter(
        user=user,
        status="PLACED",
        round__round_id=str(current_round_id) if current_round_id else None,
    ).aggregate(total=models.Sum("stake"))["total"] or Decimal("0.00")

    resp = Response({
        "id": user.id,
        "username": user.username,
        "is_admin": False,
        "balance": f"{user.balance:.2f}",
        "chips": f"{user.balance:.2f}",
        "expo": f"{expo_sum:.2f}",
    })
    resp["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
    resp["Pragma"] = "no-cache"
    resp["Vary"] = "Authorization"
    return resp

# ─────────────────────────────────────────────
# Current Round — authoritative snapshot
# ─────────────────────────────────────────────
@api_view(["GET"])
def current_round(request):
    """
    Always returns:
      - masked public cards for the phase
      - full cards (never null) for client-side animation/safety
    """
    now = int(time.time())
    with engine._LOCK:
        if engine.CURRENT_ROUND is None:
            engine.CURRENT_ROUND = engine.new_round_state(now)

        sec, phase, seconds_left = engine.calc_cycle(now)
        step = engine.reveal_step(sec)

        a_full = engine.CURRENT_ROUND["player_a_full"]
        b_full = engine.CURRENT_ROUND["player_b_full"]

        if phase == "bet":
            a_cards, b_cards = [engine.FLIPPED] * 3, [engine.FLIPPED] * 3
            result = None
        else:
            a_cards = engine.mask_cards_for_step(a_full, step, "A")
            b_cards = engine.mask_cards_for_step(b_full, step, "B")
            result = engine.CURRENT_ROUND["official_result"] if step == 6 else None

        payload = {
            "round_id": engine.CURRENT_ROUND["round_id"],
            "player_a_cards": a_cards,
            "player_b_cards": b_cards,
            "result": result,
            "phase": phase,
            "seconds_left": seconds_left,
            "reveal_step": step,
            "player_a_full": a_full,   # never null
            "player_b_full": b_full,   # never null
            "server_time": now,
        }

    # Log once at full reveal for visibility
    if payload["phase"] == "reveal" and payload["reveal_step"] == 6:
        print(
            f"[view] current_round rid={payload['round_id']} | "
            f"A=[{engine.pretty(payload['player_a_full'])}] | "
            f"B=[{engine.pretty(payload['player_b_full'])}] | "
            f"result={payload.get('result')}"
        )

    resp = Response(payload, status=status.HTTP_200_OK)
    resp["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
    resp["Pragma"] = "no-cache"
    return resp

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
    def _run():
        close_old_connections()
        try:
            print(
                f"[credit:start] t={timezone.now().strftime('%Y-%m-%d %H:%M:%S')}  "
                f"bet_id={bet_id} user_id={user_id} delay={delay_seconds}s"
            )

            now_dt = timezone.now()

            with transaction.atomic():
                r = Round.objects.select_for_update().filter(id=round_db_id).first()
                if r and not r.winner:
                    r.winner = selection
                    r.ended_at = now_dt
                    r.save(update_fields=["winner", "ended_at"])

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

                User.objects.filter(id=user_id).update(balance=F("balance") + payout)

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
@api_view(["GET"])
def current_round(request):
    now = int(time.time())
    with engine._LOCK:
        if engine.CURRENT_ROUND is None:
            engine.CURRENT_ROUND = engine.new_round_state(now)

        sec, phase, seconds_left = engine.calc_cycle(now)
        step = engine.reveal_step(sec)

        a_full = engine.CURRENT_ROUND["player_a_full"]
        b_full = engine.CURRENT_ROUND["player_b_full"]

        if phase == "bet":
            a_cards, b_cards = [engine.FLIPPED] * 3, [engine.FLIPPED] * 3
            result = None
        else:
            a_cards = engine.mask_cards_for_step(a_full, step, "A")
            b_cards = engine.mask_cards_for_step(b_full, step, "B")
            result = engine.CURRENT_ROUND["official_result"] if step == 6 else None

        payload = {
            "round_id": str(engine.CURRENT_ROUND["round_id"]),  # ⬅️ always string
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

    # (logging + headers unchanged)
    resp = Response(payload, status=status.HTTP_200_OK)
    resp["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
    resp["Pragma"] = "no-cache"
    return resp


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def place_bet(request):
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
        with engine._LOCK:
            if engine.CURRENT_ROUND is None:
                engine.CURRENT_ROUND = engine.new_round_state(now)
            if str(engine.CURRENT_ROUND["round_id"]) != str(round_id):
                return Response({"error": "Round mismatch"}, status=400)
            sec, phase, server_seconds_left = engine.calc_cycle(now)
            if phase != "bet":
                return Response({"error": "Bet window closed"}, status=400)

        if amount < MIN_STAKE:
            return Response({"error": "Bet should be greater than 100"}, status=400)
        if amount > MAX_STAKE:
            return Response({"error": "Bet should be less than 10000"}, status=400)
        if user.balance < amount:
            return Response({"error": "Insufficient balance"}, status=400)

        def _to_int(v, default=None):
            try:
                return int(v)
            except Exception:
                return default

        client_left = _to_int(client_bet_left_raw, None)
        if client_left is None or client_left < 0 or client_left > 120:
            bet_left = server_seconds_left
        else:
            bet_left = min(max(client_left, 0), server_seconds_left)

        delay_seconds = max(int(bet_left) + 10, 1)  # reveal is 10s

        round_row = _ensure_round_from_engine(engine.CURRENT_ROUND)

        print(
            f"[deduct:start] t={timezone.now().strftime('%Y-%m-%d %H:%M:%S')}  "
            f"user={user.username}({user.id}) amount={amount} round={round_id} sel={player} "
            f"bet_left={bet_left}s reveal=10s delay={delay_seconds}s"
        )

        with transaction.atomic():
            User.objects.filter(id=user.id).update(balance=F("balance") - amount)
            user.refresh_from_db(fields=["balance"])
            bet = Bet.objects.create(
                user=user,
                round=round_row,
                selection=player,
                stake=amount,
                status="PLACED",
            )

        print(
            f"[deduct:done ] t={timezone.now().strftime('%Y-%m-%d %H:%M:%S')}  "
            f"user={user.username}({user.id}) new_balance={user.balance}"
        )

        broadcast_user_profile(user.id)

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
# Last 10 feed
# ─────────────────────────────────────────────
@api_view(["GET"])
def last_ten_feed(request):
    items_qs = (
        Round.objects.filter(winner__isnull=False)
        .order_by("-created_at")
        .values("round_id", "winner", "created_at")[:10]
    )
    formatted = [{"round_id": it["round_id"], "final_result": it["winner"],
                  "official_winner": it["winner"], "created_at": it["created_at"]}
                 for it in items_qs]
    resp = Response({"items": formatted}, status=200)
    resp["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
    resp["Pragma"] = "no-cache"
    return resp

# ─────────────────────────────────────────────
# WS helpers/consumers
# ─────────────────────────────────────────────
def _compute_profile_snapshot(user_id: int):
    current_round_id = None
    with engine._LOCK:
        if engine.CURRENT_ROUND:
            current_round_id = engine.CURRENT_ROUND["round_id"]
    try:
        u = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return {"balance": "0.00", "expo": "0.00", "is_admin": False}
    if u.is_superuser:
        return {"balance": "∞", "expo": "∞", "is_admin": True}
    expo = Bet.objects.filter(
        user_id=user_id, status="PLACED",
        round__round_id=str(current_round_id) if current_round_id else None,
    ).aggregate(total=Sum("stake"))["total"] or Decimal("0.00")
    return {"balance": f"{u.balance:.2f}", "expo": f"{expo:.2f}", "is_admin": False}

def broadcast_user_profile(user_id: int):
    data = _compute_profile_snapshot(user_id)
    channel_layer = get_channel_layer()
    async_to_sync(channel_layer.group_send)(f"user_{user_id}", {"type": "profile_update", "data": data})

class UserProfileConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        user = self.scope.get("user")
        if not user or not user.is_authenticated:
            await self.close(code=4401); return
        self.user_id = user.id
        self.group_name = f"user_{self.user_id}"
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()
        await self.send_json({"type": "debug", "msg": f"joined {self.group_name}"})
        data = await database_sync_to_async(_compute_profile_snapshot)(self.user_id)
        await self.send_json({"type": "profile_update", **data})

    async def disconnect(self, code):
        if hasattr(self, "group_name"):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive_json(self, content, **kwargs): pass
    async def profile_update(self, event):
        await self.send_json({"type": "profile_update", **event["data"]})
    async def force_logout(self, event):
        await self.send_json({"type": "force_logout", **(event.get("data") or {})})
        await self.close(code=4403)

class RoundConsumer(AsyncJsonWebsocketConsumer):
    group_name = "rounds"
    async def connect(self):
        user = self.scope.get("user")
        if not user or not user.is_authenticated:
            await self.close(code=4401); return
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()
    async def disconnect(self, code):
        await self.channel_layer.group_discard(self.group_name, self.channel_name)
    async def receive_json(self, content, **kwargs): pass
    async def round_update(self, event):
        await self.send_json({"type": "round_update", **event["data"]})
