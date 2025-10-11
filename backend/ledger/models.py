from django.db import models
from users.models import User
from decimal import Decimal

class Transaction(models.Model):
    TYPE_CHOICES = (
        ('grant', 'Grant'),     # admin credits chips to user
        ('debit', 'Debit'),     # (optional) future admin debits
        ('bet', 'Bet'),         # (not used for statement if you rely on BetRecord)
        ('win', 'Win'),
        ('loss', 'Loss'),
    )

    from_user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='sent_transactions')
    to_user   = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='received_transactions')
    amount    = models.DecimalField(max_digits=10, decimal_places=2)
    type      = models.CharField(max_length=10, choices=TYPE_CHOICES)
    timestamp = models.DateTimeField(auto_now_add=True)
    description = models.TextField(blank=True)

    # 🆕 fields for statement math
    prev_balance = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("0.00"))
    credit       = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("0.00"))
    debit        = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("0.00"))
    balance      = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("0.00"))

    class Meta:
        ordering = ('-timestamp',)

    def __str__(self):
        who = self.to_user.username if self.to_user else '—'
        return f"{self.type} → {who} : {self.amount}"
