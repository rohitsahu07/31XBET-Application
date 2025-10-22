# backend/ledger/views.py
from rest_framework import viewsets, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from rest_framework.response import Response
from django.db import models
from django.utils import timezone
from decimal import Decimal
from itertools import chain

from .models import Transaction
from .serializers import TransactionSerializer
from bets.models import Bet
from users.models import User


# ─────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────
DT_FMT = "%d-%b-%y %I:%M %p"  # e.g. 22-Oct-25 08:42 PM

def _to_local(dt):
    """Return timezone-aware dt converted to the current TZ."""
    if dt is None:
        return None
    if timezone.is_naive(dt):
        dt = timezone.make_aware(dt, timezone.get_current_timezone())
    return timezone.localtime(dt)

def _fmt_dt(dt):
    """(pretty, iso, sort_ts) triplet for UI."""
    if dt is None:
        return None, None, None
    pretty = dt.strftime(DT_FMT)
    iso = dt.isoformat()
    sort_ts = int(dt.timestamp() * 1000)  # ms since epoch
    return pretty, iso, sort_ts

def _bet_display_dt(bet):
    """
    Single source of truth for 'when' a bet should appear in Statement/Ledger.
    Prefer the round's end time (settlement), else bet.settled_at, else created_at.
    """
    r = getattr(bet, "round", None)
    dt = getattr(r, "ended_at", None) or getattr(bet, "settled_at", None) or bet.created_at
    return _to_local(dt)

def _tx_description(t: Transaction) -> str:
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
        target_id = int(q_user_id) if (user.is_superuser and q_user_id) else user.id

        # ───────── Transfers (money movements) ─────────
        transfers = Transaction.objects.filter(to_user_id=target_id).select_related(
            "from_user", "to_user"
        )
        transfer_rows = []
        for t in transfers:
            local_dt = _to_local(t.timestamp)
            pretty, iso, sort_ts = _fmt_dt(local_dt)
            transfer_rows.append({
                "date": pretty,
                "iso": iso,
                "sort_ts": sort_ts,
                "description": t.description or _tx_description(t),
                "prev_balance": f"{t.prev_balance:.2f}" if t.prev_balance is not None else "0.00",
                "credit": f"{t.credit:.2f}" if t.credit else "0.00",
                "debit": f"{t.debit:.2f}" if t.debit else "0.00",
                "balance": f"{t.balance:.2f}" if t.balance is not None else "0.00",
                "source": "transfer",
            })

        # ───────── Bets (for statement view) ─────────
        bets = Bet.objects.filter(user_id=target_id).select_related("round")

        bet_rows = []
        for b in bets:
            # result → credit/debit
            if b.status == "WON":
                result = "WON"
                net = b.net if b.net is not None else (b.stake * Decimal("0.96"))
                credit = net
                debit = Decimal("0.00")
            else:
                result = "LOSS"
                credit = Decimal("0.00")
                debit = b.stake or Decimal("0.00")

            # time (unified)
            dt_local = _bet_display_dt(b)
            pretty, iso, sort_ts = _fmt_dt(dt_local)

            r = getattr(b, "round", None)
            round_id = getattr(r, "round_id", None) or "-"

            bet_rows.append({
                "date": pretty,                 # pretty string for table
                "iso": iso,                     # ISO for debugging/possible UI
                "sort_ts": sort_ts,             # reliable sort key
                "description": f"{result} - Teen Patti T20 ({round_id})",
                "prev_balance": None,
                "credit": f"{credit:.2f}",
                "debit": f"{debit:.2f}",
                "balance": None,
                "source": "bet",
            })

        # ───────── Merge & sort (desc by sort_ts) ─────────
        rows = list(chain(transfer_rows, bet_rows))
        rows.sort(key=lambda r: (r.get("sort_ts") or 0), reverse=True)

        # ───────── Compute running balance (oldest→newest) ─────────
        balance = Decimal("0.00")
        for r in reversed(rows):
            prev = balance
            credit = Decimal(r["credit"])
            debit = Decimal(r["debit"])
            balance = prev + credit - debit
            r["prev_balance"] = f"{prev:.2f}"
            r["balance"] = f"{balance:.2f}"

        return Response(rows, status=status.HTTP_200_OK)


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

        target_id = int(q_user_id) if (user.is_superuser and q_user_id) else user.id

        bets = Bet.objects.filter(user_id=target_id).select_related("round")

        rows = []
        for b in bets:
            # credit/debit by result
            if b.status == "WON":
                net = b.net if b.net is not None else (b.stake * Decimal("0.96"))
                credit = net
                debit = Decimal("0.00")
            else:
                credit = Decimal("0.00")
                debit = b.stake or Decimal("0.00")

            # unified time for ledger
            dt_local = _bet_display_dt(b)
            pretty, iso, sort_ts = _fmt_dt(dt_local)

            r = getattr(b, "round", None)
            round_id = getattr(r, "round_id", None) or "-"
            winner = getattr(r, "winner", None)
            won_by = f"Player {winner}" if winner in ("A", "B") else None

            rows.append({
                "date": pretty,                 # pretty for display
                "iso": iso,                     # ISO string
                "sort_ts": sort_ts,             # epoch ms for sorting
                "description": f"Teen Patti T20 ({round_id})",
                "prev_balance": None,
                "credit": f"{credit:.2f}",
                "debit": f"{debit:.2f}",
                "balance": None,
                "source": "bet",
                "round_id": round_id,           # extra
                "won_by": won_by,               # extra ("Player A/B")
                "round_time": iso,              # keep field name you used; ISO value
            })

        # sort by sort_ts desc (settlement time first)
        rows.sort(key=lambda r: (r.get("sort_ts") or 0), reverse=True)

        return Response(rows, status=status.HTTP_200_OK)
