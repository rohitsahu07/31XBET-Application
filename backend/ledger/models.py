from django.db import models
from users.models import User
from decimal import Decimal

class Transaction(models.Model):
    TYPE_CHOICES = (
        ('grant', 'Grant'),
        ('bet', 'Bet'),
        ('win', 'Win'),
        ('loss', 'Loss'),
    )
    from_user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='sent_transactions')
    to_user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='received_transactions')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    type = models.CharField(max_length=10, choices=TYPE_CHOICES)
    timestamp = models.DateTimeField(auto_now_add=True)
    description = models.TextField(blank=True)