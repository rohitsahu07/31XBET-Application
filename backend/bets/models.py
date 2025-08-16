from django.db import models
from users.models import User

class Game(models.Model):
    TYPE_CHOICES = (('cricket', 'Cricket'), ('casino', 'Casino'))
    type = models.CharField(max_length=10, choices=TYPE_CHOICES)
    name = models.CharField(max_length=255)
    status = models.CharField(
        max_length=10,
        choices=(('upcoming', 'Upcoming'), ('live', 'Live'), ('ended', 'Ended')),
        default='upcoming'
    )
    metadata = models.JSONField(default=dict)  # ✅ Use built-in JSONField

class Bet(models.Model):
    STATUS_CHOICES = (('pending', 'Pending'), ('won', 'Won'), ('lost', 'Lost'))
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    game = models.ForeignKey(Game, on_delete=models.CASCADE)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    details = models.JSONField(default=dict)  # ✅ Use built-in JSONField
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='pending')
    outcome = models.DecimalField(max_digits=10, decimal_places=2, null=True)
