# backend/ledger/models.py
from __future__ import annotations

from decimal import Decimal
from typing import Optional

from django.db import models, transaction as dj_transaction
from django.utils import timezone
from users.models import User

# NOTE:
# - We keep the same types you already use from the codebase: "bet" (debit on place),
#   and "win" (credit on settle). "grant" is for admin credit; "debit" for admin withdrawal.
# - We DO NOT create "loss" rows at settle time (no money moves then).
# - This model is ONLY for money movements.

class Transaction(models.Model):
    TYPE_CHOICES = (
        ("grant", "Grant/Credit"),   # admin/system credits chips to user
        ("debit", "Admin Debit"),    # admin/system debits chips from user (withdrawal)
        ("bet", "Bet Stake (Debit)"),# user places a bet, stake debited
        ("win", "Win Payout (Credit)"),
        # ("loss", "Loss (No-Money-Move)")  # not used; stake already debited on place
    )

    # Money is recorded against the "to_user" (the account whose balance changes)
    # For grant/win → to_user receives credit
    # For bet/debit → to_user is the user being debited
    from_user = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name="sent_transactions"
    )
    to_user = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name="received_transactions"
    )

    # Optional links to gameplay for better statements (no circular import at import-time)
    round = models.ForeignKey(
        "bets.Round", on_delete=models.SET_NULL, null=True, blank=True, related_name="transactions"
    )
    bet = models.ForeignKey(
        "bets.Bet", on_delete=models.SET_NULL, null=True, blank=True, related_name="transactions"
    )

    # Amount that moved (always positive)
    amount = models.DecimalField(max_digits=12, decimal_places=2)

    # Kind of transaction
    type = models.CharField(max_length=10, choices=TYPE_CHOICES, db_index=True)

    # Human-readable description you’re already using in views (kept)
    description = models.TextField(blank=True)

    # Statement math columns (append-only running balance for to_user)
    prev_balance = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    credit       = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    debit        = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    balance      = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))

    # Timestamps
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("-timestamp",)
        indexes = [
            models.Index(fields=("to_user", "timestamp")),
            models.Index(fields=("type", "timestamp")),
            models.Index(fields=("round", "timestamp")),
        ]

    def __str__(self):
        who = self.to_user.username if self.to_user else "—"
        return f"{self.type} → {who} : {self.amount}"

    # -----------------------------
    # Normalization & auto-math
    # -----------------------------
    def _normalize_credit_debit(self):
        """
        Ensure exactly one of credit/debit is set based on type & amount.
        We don't change values if the caller already set them correctly.
        """
        amt = (self.amount or Decimal("0.00")).copy_abs().quantize(Decimal("0.01"))

        # If caller already provided one, respect it.
        if (self.credit and self.credit > 0) or (self.debit and self.debit > 0):
            # Coerce to 2dp
            if self.credit: self.credit = self.credit.quantize(Decimal("0.01"))
            if self.debit:  self.debit  = self.debit.quantize(Decimal("0.01"))
            return

        # Infer from type when missing
        if self.type in ("grant", "win"):
            self.credit = amt
            self.debit = Decimal("0.00")
        elif self.type in ("bet", "debit"):
            self.debit = amt
            self.credit = Decimal("0.00")
        else:
            # Safe default: treat as no-op (should not happen)
            self.credit = Decimal("0.00")
            self.debit  = Decimal("0.00")

    def _compute_running_balance(self):
        """
        If prev_balance/balance aren't provided, compute them from the latest row
        for this to_user (append-only). We do this inside a transaction to reduce
        race conditions in single-EC2 setups.
        """
        if not self.to_user_id:
            # Without an account, we can't produce a running balance
            return

        needs_math = (
            (self.prev_balance is None or self.prev_balance == Decimal("0.00"))
            and (self.balance is None or self.balance == Decimal("0.00"))
        )
        if not needs_math:
            return

        with dj_transaction.atomic():
            # Lock last row for this user to compute an accurate running balance
            last = (
                Transaction.objects
                .select_for_update(skip_locked=True)
                .filter(to_user_id=self.to_user_id)
                .order_by("-timestamp", "-id")
                .first()
            )
            prev = last.balance if last else (self.to_user.balance if self.type in ("grant", "debit") else Decimal("0.00"))
            # NOTE: For bet/win we usually pass explicit prev/balance from the caller;
            # this path is primarily a convenience when creating manual admin credits/debits.

            self.prev_balance = prev or Decimal("0.00")
            self.balance = (self.prev_balance + self.credit - self.debit).quantize(Decimal("0.01"))

    def save(self, *args, **kwargs):
        # Normalize credit/debit if not provided
        self._normalize_credit_debit()

        # Auto-compute prev/balance if not provided (admin ops convenience).
        # In your place_bet/engine flows, you’re already setting these explicitly.
        self._compute_running_balance()

        super().save(*args, **kwargs)
