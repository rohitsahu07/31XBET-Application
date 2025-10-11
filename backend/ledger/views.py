from rest_framework import viewsets, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from rest_framework.response import Response
from django.db import models
from itertools import chain

from .models import Transaction
from .serializers import TransactionSerializer

# Import bet side for merging
from bets.models import BetRecord
from bets.serializers import BetRecordSerializer


class LedgerViewSet(viewsets.ReadOnlyModelViewSet):
    """(kept) raw ledger entries from Transaction table for user and descendants"""
    serializer_class = TransactionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        # if you use MPTT hierarchy, this keeps original behavior
        descendants = user.get_descendants(include_self=True).values_list('id', flat=True)
        return Transaction.objects.filter(
            models.Q(from_user_id__in=descendants) | models.Q(to_user_id__in=descendants)
        ).order_by('-timestamp')


class StatementView(APIView):
    """
    Returns a single unified statement feed (bets + chip transfers) for:
      - Admin: /api/ledger/statement/?user_id=<id>  (required to view someone)
      - User:  their own statement (ignores user_id)
    Output rows: date, description, prev_balance, credit, debit, balance, source
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        q_user_id = request.query_params.get('user_id')

        # Decide whose statement to show
        if user.is_superuser and q_user_id:
            target_id = int(q_user_id)
        else:
            target_id = user.id

        # Chip transfers (Transaction) for target user
        # Include rows where the user is the recipient (to_user):
        transfers = Transaction.objects.filter(to_user_id=target_id).order_by('-timestamp')

        # Bets (BetRecord) for target user
        bets = BetRecord.objects.filter(user_id=target_id).order_by('-date_time')

        # Normalize to a common dict structure
        rows = []

        for t in transfers:
            rows.append({
                "date": t.timestamp,
                "description": t.description or self._tx_description(t),
                "prev_balance": str(t.prev_balance),
                "credit": str(t.credit),
                "debit": str(t.debit),
                "balance": str(t.balance),
                "source": "transfer",
            })

        for b in bets:
            rows.append({
                "date": b.date_time,
                "description": b.description,
                "prev_balance": str(b.prev_balance),
                "credit": str(b.credit),
                "debit": str(b.debit),
                "balance": str(b.balance),
                "source": "bet",
                "won_by": b.won_by,
                "status": b.status,
            })

        # Sort by date desc
        rows.sort(key=lambda r: r["date"], reverse=True)

        # Format date as string (frontend friendly)
        for r in rows:
            r["date"] = r["date"].strftime("%d-%b-%y %I:%M %p")

        return Response(rows, status=status.HTTP_200_OK)

    def _tx_description(self, t: Transaction) -> str:
        if t.type == 'grant':
            who = t.from_user.username if t.from_user else 'Admin'
            return f"Chips credited to {t.to_user.username} by {who}"
        elif t.type == 'debit':
            who = t.from_user.username if t.from_user else 'Admin'
            return f"Chips debited from {t.to_user.username} by {who}"
        return t.type.capitalize()
