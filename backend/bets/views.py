from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db import transaction
from decimal import Decimal
from .models import BetRecord
from .serializers import BetRecordSerializer
import random

class BetRecordViewSet(viewsets.ModelViewSet):
    """
    Handles all betting transactions — create bet, list history, etc.
    """
    serializer_class = BetRecordSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        # ✅ Admin can filter by user_id query param
        if user.is_superuser:
            user_id = self.request.query_params.get("user_id")
            if user_id:
                return BetRecord.objects.filter(user_id=user_id).order_by("-date_time")
            return BetRecord.objects.all().order_by("-date_time")
        # ✅ Normal users see only their own records
        return BetRecord.objects.filter(user=user).order_by("-date_time")

    def perform_create(self, serializer):
        """
        When a user places a bet, deducts or credits their balance 
        and saves a record with description.
        """
        user = self.request.user
        amount = self.request.data.get("amount")

        if not amount:
            raise ValueError("Amount is required.")

        amount = Decimal(amount)
        prev_balance = user.balance

        # ✅ Check user balance
        if user.balance < amount:
            raise ValueError("Insufficient balance.")

        # ✅ Randomly decide win/loss (for simulation)
        result = random.choice(["won", "lost"])
        credit, debit, new_balance = Decimal("0.00"), Decimal("0.00"), prev_balance

        if result == "won":
            credit = amount * Decimal("2")
            new_balance = prev_balance + credit
            description = f"WON - Teen Patti T20 ({random.randint(100000000000000, 999999999999999)})"
        else:
            debit = amount
            new_balance = prev_balance - debit
            description = f"LOSS - Teen Patti T20 ({random.randint(100000000000000, 999999999999999)})"

        # ✅ Save to DB safely in a transaction
        with transaction.atomic():
            user.balance = new_balance
            user.save()

            serializer.save(
                user=user,
                description=description,
                prev_balance=prev_balance,
                credit=credit,
                debit=debit,
                balance=new_balance,
                status=result,
            )
