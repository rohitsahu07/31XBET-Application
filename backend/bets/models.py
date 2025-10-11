from django.db import models
from users.models import User

class BetRecord(models.Model):
    STATUS_CHOICES = (
        ('won', 'Won'),
        ('lost', 'Lost'),
    )

    user = models.ForeignKey(User, on_delete=models.CASCADE)
    date_time = models.DateTimeField(auto_now_add=False)
    description = models.TextField()
    won_by = models.CharField(max_length=20, default='Player A')  # 🆕 Added field
    prev_balance = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    credit = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    debit = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    balance = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='lost')

    def __str__(self):
        return f"{self.user.username} - {self.description}"
