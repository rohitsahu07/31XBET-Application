from channels.generic.websocket import AsyncJsonWebsocketConsumer
from channels.db import database_sync_to_async
from users.models import User
from .models import Bet
from .engine import CURRENT_ROUND
from django.db.models import Sum
from decimal import Decimal


def _compute_profile_snapshot(user_id: int):
    """
    Return current balance and open exposure for the user's current round.
    """
    global CURRENT_ROUND
    current_round_id = CURRENT_ROUND["round_id"] if CURRENT_ROUND else None
    try:
        u = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return {"balance": "0.00", "expo": "0.00", "is_admin": False}

    if u.is_superuser:
        return {"balance": "∞", "expo": "∞", "is_admin": True}

    expo = (
        Bet.objects.filter(
            user_id=user_id,
            status="PLACED",
            round__round_id=str(current_round_id) if current_round_id else None,
        ).aggregate(total=Sum("stake"))["total"]
        or Decimal("0.00")
    )
    return {"balance": f"{u.balance:.2f}", "expo": f"{expo:.2f}", "is_admin": False}


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

        # Initial snapshot so UI paints immediately
        data = await database_sync_to_async(_compute_profile_snapshot)(self.user_id)
        await self.send_json({"type": "profile_update", "stage": "snapshot", **data})

    async def disconnect(self, code):
        # Guard so we don't explode if connect() didn't finish
        if hasattr(self, "group_name"):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive_json(self, content, **kwargs):
        # Optional: ping/pong or commands from client
        pass

    async def profile_update(self, event):
        """
        Called when server broadcasts:
            channel_layer.group_send("user_<id>", {"type": "profile_update", "data": {...}})
        """
        data = event.get("data") or {}
        await self.send_json({"type": "profile_update", **data})

    async def bet_settlement(self, event):
        """
        Optional custom event type if you ever broadcast settlements.
        """
        data = event.get("data") or {}
        await self.send_json({"type": "profile_update", **data})

    # 🔧 FIX: handle "force.logout" events (Channels maps '.' -> '_')
    async def force_logout(self, event):
        # Forward a structured message then close
        await self.send_json({"type": "force_logout", **(event.get("data") or {})})
        await self.close(code=4403)


class RoundConsumer(AsyncJsonWebsocketConsumer):
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