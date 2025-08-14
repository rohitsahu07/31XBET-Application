from django.db import models
from django.contrib.auth.models import AbstractUser, UserManager
from mptt.models import MPTTModel, TreeForeignKey, TreeManager
from decimal import Decimal

# Custom manager for Django compatibility
class CustomUserManager(UserManager):
    pass

class User(AbstractUser, MPTTModel):
    ROLE_CHOICES = (
        ('super_admin', 'Super Admin'),
        ('master_admin', 'Master Admin'),
        ('admin', 'Admin'),
        ('client', 'Client'),
    )
    role = models.CharField(max_length=20, choices=ROLE_CHOICES)
    parent = TreeForeignKey('self', on_delete=models.CASCADE, null=True, blank=True, related_name='children')
    balance = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))

    # Default manager for Django / createsuperuser
    objects = CustomUserManager()
    # Tree manager for MPTT operations
    tree_objects = TreeManager()

    class MPTTMeta:
        order_insertion_by = ['username']

    def __str__(self):
        return self.username
