# backend/bets/models.py
from __future__ import annotations

from decimal import Decimal
from typing import Any, Iterable, Optional

from django.conf import settings
from django.db import models
from django.utils import timezone
from datetime import datetime


# ─────────────────────────────────────────────────────────────────────────────
# Utilities
# ─────────────────────────────────────────────────────────────────────────────

def _coerce_dt(value: Any) -> Optional[datetime]:
    """
    Accept either a timezone-aware datetime, a naive datetime, or an epoch (int/float)
    and return a timezone-aware datetime in the current timezone.

    This is used in RoundFeed.save() so that accidentally passing an epoch integer
    (e.g. engine start_time) will never trigger: "fromisoformat: argument must be str".
    """
    if value is None:
        return None

    # Epoch seconds → aware datetime
    if isinstance(value, (int, float)):
        return timezone.make_aware(
            datetime.fromtimestamp(int(value)),
            timezone.get_current_timezone(),
        )

    # Naive datetime → make aware
    if isinstance(value, datetime) and timezone.is_naive(value):
        return timezone.make_aware(value, timezone.get_current_timezone())

    # Already aware or unknown → return as-is (let the DB/backend validate)
    return value


# ─────────────────────────────────────────────────────────────────────────────
# BetRecord (simple audit of individual user bets)
# NOTE: This model is kept minimal because your API mainly uses RoundFeed.
# ─────────────────────────────────────────────────────────────────────────────

class BetRecord(models.Model):
    PLAYER_CHOICES = (("A", "A"), ("B", "B"))

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="bet_records",
        null=True,
        blank=True,
    )
    round_id = models.CharField(max_length=32, db_index=True)
    player = models.CharField(max_length=1, choices=PLAYER_CHOICES)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("-created_at",)

    def __str__(self) -> str:
        return f"BetRecord(id={self.pk}, round={self.round_id}, {self.player}, {self.amount})"


# ─────────────────────────────────────────────────────────────────────────────
# RoundFeed (single table powering the admin “Round feeds” list & last-10 API)
# Stores both engine rows (“Engine Final”) and user bet rows (“Place Bet”).
# ─────────────────────────────────────────────────────────────────────────────

class RoundFeed(models.Model):
    ITEM_TYPES = (
        ("Engine Final", "Engine Final"),  # engine-produced row
        ("Place Bet", "Place Bet"),        # user placed a bet
    )

    item_type = models.CharField(max_length=32, choices=ITEM_TYPES)

    # Use CharField for round_id to be future-proof (IDs can be long)
    round_id = models.CharField(max_length=32, db_index=True)

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    start_time = models.DateTimeField(null=True, blank=True)
    end_time = models.DateTimeField(null=True, blank=True)

    # Cards & results
    player_a_cards = models.JSONField(null=True, blank=True)
    player_b_cards = models.JSONField(null=True, blank=True)

    official_winner = models.CharField(
        max_length=1, null=True, blank=True
    )  # 'A' or 'B' when engine final
    player_choice = models.CharField(
        max_length=1, null=True, blank=True
    )  # 'A' or 'B' for a Place Bet row

    bet_amount = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True
    )

    # How the line was produced: 'official' (engine-set) or 'biased' (during bet phase)
    resolver = models.CharField(max_length=32, null=True, blank=True)

    # The final result attached to this feed line (A/B). For engine rows this
    # mirrors official_winner; for bets placed during "bet" phase it's the
    # biased result we show to the user.
    final_result = models.CharField(max_length=1, null=True, blank=True)

    class Meta:
        ordering = ("-created_at",)
        indexes = [
            models.Index(fields=("round_id",)),
            models.Index(fields=("item_type", "created_at")),
        ]

    def save(self, *args, **kwargs):
        """
        Normalize times before saving so passing epoch seconds never breaks.
        """
        self.start_time = _coerce_dt(self.start_time)
        self.end_time = _coerce_dt(self.end_time)
        super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"{self.item_type} · {self.round_id} · {self.created_at:%Y-%m-%d %H:%M:%S}"
