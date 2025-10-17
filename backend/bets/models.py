# backend/bets/models.py

from __future__ import annotations

from decimal import Decimal
from typing import Optional
from datetime import datetime

from django.conf import settings
from django.db import models
from django.utils import timezone


# -----------------------------------------------------------------------------
# Helpers
# -----------------------------------------------------------------------------
def _aware(dt: Optional[datetime]) -> Optional[datetime]:
    if dt is None:
        return None
    if timezone.is_naive(dt):
        return timezone.make_aware(dt, timezone.get_current_timezone())
    return dt


# -----------------------------------------------------------------------------
# Round = single game instance (canonical truth)
# -----------------------------------------------------------------------------
class Round(models.Model):
    """
    Canonical record of a Teen Patti T20 round.
    Keep this minimal: identifiers, timing, cards, resolver, winner.
    """
    GAME_CHOICES = (
        ("tpt20", "Teen Patti T20"),
    )

    WINNER_CHOICES = (("A", "Player A"), ("B", "Player B"))

    # External/user-facing id you already display like 102251013170519
    round_id = models.CharField(max_length=32, unique=True, db_index=True)
    game = models.CharField(max_length=16, choices=GAME_CHOICES, default="tpt20")

    started_at = models.DateTimeField(null=True, blank=True)
    ended_at = models.DateTimeField(null=True, blank=True)

    # Cards as compact JSON (e.g. ["7H","JS","AD"])
    player_a_cards = models.JSONField(null=True, blank=True)
    player_b_cards = models.JSONField(null=True, blank=True)

    # Engine resolution info
    resolver = models.CharField(
        max_length=16,
        choices=(("official", "Official"), ("biased", "Biased")),
        default="official",
    )
    winner = models.CharField(max_length=1, choices=WINNER_CHOICES, null=True, blank=True)

    # Optional economics knobs (useful later for rake/house edge, can be 0)
    rake_pct = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal("0.00"))

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("-created_at",)
        indexes = [
            models.Index(fields=("game", "created_at")),
        ]

    def save(self, *args, **kwargs):
        self.started_at = _aware(self.started_at)
        self.ended_at = _aware(self.ended_at)
        super().save(*args, **kwargs)

    @property
    def title_str(self) -> str:
        # "Teen Patti T20 (102251013170519)"
        label = dict(self.GAME_CHOICES).get(self.game, self.game)
        return f"{label} ({self.round_id})"

    def __str__(self) -> str:
        w = f" · winner {self.winner}" if self.winner else ""
        return f"{self.title_str}{w}"


# -----------------------------------------------------------------------------
# Bet = a user's bet on a specific round
# -----------------------------------------------------------------------------
class Bet(models.Model):
    """
    One row per user's bet. This model is the single source of truth for:
      - stake (amount user bet)
      - selection (A/B)
      - settlement (won/lost, payout, net)
      - timestamps for report ordering
    This keeps MY LEDGER easy to compute, and feeds the statement later via ledger app.
    """
    CHOICE = (("A", "Player A"), ("B", "Player B"))
    STATUS = (
        ("PLACED", "Placed"),
        ("WON", "Won"),
        ("LOST", "Lost"),
        ("CANCELLED", "Cancelled"),
    )

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="bets")
    round = models.ForeignKey(Round, on_delete=models.CASCADE, related_name="bets")

    selection = models.CharField(max_length=1, choices=CHOICE)
    stake = models.DecimalField(max_digits=12, decimal_places=2)

    # Settlement
    status = models.CharField(max_length=10, choices=STATUS, default="PLACED", db_index=True)
    payout = models.DecimalField(  # gross payout credited to user when WON (stake * odds minus rake)
        max_digits=12, decimal_places=2, default=Decimal("0.00")
    )
    net = models.DecimalField(     # net impact to user: payout - stake (WON positive, LOST negative)
        max_digits=12, decimal_places=2, default=Decimal("0.00")
    )
    settled_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("-created_at",)
        constraints = [
            models.UniqueConstraint(
                fields=("user", "round", "selection", "stake", "status"),
                condition=models.Q(status="PLACED"),
                name="uniq_open_bet_fingerprint",
            )
        ]
        indexes = [
            models.Index(fields=("user", "created_at")),
            models.Index(fields=("round", "status")),
        ]

    def settle(self, winner: str, return_ratio: Decimal = Decimal("1.96")) -> None:
        """
        Settle this bet against the round's winner.
        By default, stake*1.96 = 96% net win for 100 stake (like your samples).
        - If won: payout = stake * return_ratio; net = payout - stake
        - If lost: payout = 0; net = -stake
        """
        self.settled_at = timezone.now()
        if winner == self.selection:
            self.status = "WON"
            self.payout = (self.stake * return_ratio).quantize(Decimal("0.01"))
            self.net = (self.payout - self.stake).quantize(Decimal("0.01"))
        else:
            self.status = "LOST"
            self.payout = Decimal("0.00")
            self.net = (Decimal("0.00") - self.stake).quantize(Decimal("0.01"))

    @property
    def won_by_label(self) -> Optional[str]:
        if self.round.winner in ("A", "B"):
            return f"Player {self.round.winner}"
        return None

    @property
    def description_for_ledger(self) -> str:
        # Matches your sample: "Teen Patti T20 (102251013170519) (13-Oct-25 05:06 PM)"
        ts = self.settled_at or self.created_at
        ts_str = ts.astimezone(timezone.get_current_timezone()).strftime("%d-%b-%y %I:%M %p")
        return f"{self.round.title_str} ({ts_str})"

    def __str__(self) -> str:
        return f"Bet#{self.pk} {self.user} {self.round.round_id} {self.selection} {self.stake} [{self.status}]"
