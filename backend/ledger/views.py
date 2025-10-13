from rest_framework import viewsets, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from rest_framework.response import Response
from django.db import models
from decimal import Decimal
from itertools import chain

from .models import Transaction
from .serializers import TransactionSerializer
from bets.models import Bet
from users.models import User


# ─────────────────────────────────────────────
# Ledger ViewSet (Raw transactions) — unchanged, still available via router
# e.g. /api/ledger/ledger/
# ─────────────────────────────────────────────
class LedgerViewSet(viewsets.ReadOnlyModelViewSet):
    """Raw ledger entries from Transaction table for user and descendants"""
    serializer_class = TransactionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        descendants = (
            user.get_descendants(include_self=True).values_list("id", flat=True)
            if hasattr(user, "get_descendants")
            else [user.id]
        )
        return (
            Transaction.objects.filter(
                models.Q(from_user_id__in=descendants)
                | models.Q(to_user_id__in=descendants)
            )
            .order_by("-timestamp")
        )


# ─────────────────────────────────────────────
# Account Statement (COMBINED): transfers + bets
#   URL: /api/ledger/statement/
#   Admin can pass ?user_id=<id>
#   Response: array; (date, description, credit, debit, balance, ...)
# ─────────────────────────────────────────────
class StatementView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        q_user_id = request.query_params.get("user_id")

        # Determine target user
        if user.is_superuser and q_user_id:
            target_id = int(q_user_id)
        else:
            target_id = user.id

        # ───────── Transfers (money movements) ─────────
        transfers = (
            Transaction.objects.filter(to_user_id=target_id)
            .order_by("-timestamp")
        )
        transfer_rows = []
        for t in transfers:
            transfer_rows.append({
                "date": t.timestamp,
                "description": t.description or self._tx_description(t),
                "prev_balance": f"{t.prev_balance:.2f}" if t.prev_balance is not None else "0.00",
                "credit": f"{t.credit:.2f}" if t.credit else "0.00",
                "debit": f"{t.debit:.2f}" if t.debit else "0.00",
                "balance": f"{t.balance:.2f}" if t.balance is not None else "0.00",
                "source": "transfer",
            })

        # ───────── Bets (for statement view) ─────────
        # We mirror the prior behavior:
        # WON  → credit = net (e.g., 96 on a 100 stake @1.96)
        # LOSS/PLACED → debit = stake
        bets = (
            Bet.objects.filter(user_id=target_id)
            .order_by("-created_at")
            .select_related("round")
        )
        bet_rows = []
        for b in bets:
            if b.status == "WON":
                result = "WON"
                net = b.net if b.net is not None else (b.stake * Decimal("0.96"))
                credit = net
                debit = Decimal("0.00")
            else:
                # LOST / PLACED / CANCELLED → treat as loss for statement math
                result = "LOSS"
                credit = Decimal("0.00")
                debit = b.stake or Decimal("0.00")

            r = getattr(b, "round", None)
            round_id = getattr(r, "round_id", None) or "-"
            bet_rows.append({
                "date": b.created_at,
                "description": f"{result} - Teen Patti T20 ({round_id})",
                "prev_balance": None,
                "credit": f"{credit:.2f}",
                "debit": f"{debit:.2f}",
                "balance": None,
                "source": "bet",
            })

        # ───────── Merge & sort (desc) ─────────
        rows = list(chain(transfer_rows, bet_rows))
        rows.sort(key=lambda r: r["date"], reverse=True)

        # ───────── Compute running balance (oldest→newest) ─────────
        balance = Decimal("0.00")
        for r in reversed(rows):
            prev = balance
            credit = Decimal(r["credit"])
            debit = Decimal(r["debit"])
            balance = prev + credit - debit
            r["prev_balance"] = f"{prev:.2f}"
            r["balance"] = f"{balance:.2f}"

        # ───────── Format dates ─────────
        for r in rows:
            if hasattr(r["date"], "strftime"):
                r["date"] = r["date"].strftime("%d-%b-%y %I:%M %p")

        return Response(rows, status=status.HTTP_200_OK)

    def _tx_description(self, t: Transaction) -> str:
        if t.type == "grant":
            who = t.from_user.username if t.from_user else "Admin"
            return f"Chips credited to {t.to_user.username} by {who}"
        elif t.type == "debit":
            who = t.from_user.username if t.from_user else "Admin"
            return f"Chips debited from {t.to_user.username} by {who}"
        elif t.type == "withdraw":
            return f"Chips withdrawal by {t.to_user.username}"
        elif t.type == "deposit":
            return f"Chips deposit by {t.to_user.username}"
        return t.type.capitalize()


# ─────────────────────────────────────────────
# MY LEDGER (BETS ONLY): profit/loss table
#   URL: /api/ledger/my-ledger/
#   Admin can pass ?user_id=<id>
#   Response: array (bet rows only) + extra fields for UI
# ─────────────────────────────────────────────
class BetLedgerView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        q_user_id = request.query_params.get("user_id")

        if user.is_superuser and q_user_id:
            target_id = int(q_user_id)
        else:
            target_id = user.id

        bets = (
            Bet.objects.filter(user_id=target_id)
            .order_by("-created_at")
            .select_related("round")
        )

        rows = []
        for b in bets:
            if b.status == "WON":
                result = "WON"
                net = b.net if b.net is not None else (b.stake * Decimal("0.96"))
                credit = net
                debit = Decimal("0.00")
            else:
                result = "LOSS"
                credit = Decimal("0.00")
                debit = b.stake or Decimal("0.00")

            r = getattr(b, "round", None)
            round_id = getattr(r, "round_id", None) or "-"
            winner = getattr(r, "winner", None)
            won_by = f"Player {winner}" if winner in ("A", "B") else None
            round_time = getattr(r, "ended_at", None) or b.created_at

            rows.append({
                "date": round_time,                       # will be formatted below
                "description": f"Teen Patti T20 ({round_id})",
                "prev_balance": None,
                "credit": f"{credit:.2f}",
                "debit": f"{debit:.2f}",
                "balance": None,
                "source": "bet",
                "round_id": round_id,                     # extra
                "won_by": won_by,                         # extra ("Player A/B")
                "round_time": round_time,                 # extra
            })

        # sort by round_time desc
        rows.sort(key=lambda r: r["round_time"], reverse=True)

        # format date string like your UI
        for r in rows:
            dt = r.get("round_time") or r.get("date")
            if hasattr(dt, "strftime"):
                r["date"] = dt.strftime("%d-%b-%y %I:%M %p")
            else:
                r["date"] = r.get("date")

        return Response(rows, status=status.HTTP_200_OK)
