# backend/users/models.py (corrected manager to subclass TreeManager for MPTT compatibility, fixed typo, added created_by field)

from django.db import models
from django.contrib.auth.models import AbstractUser, BaseUserManager
from mptt.models import MPTTModel, TreeForeignKey
from mptt.managers import TreeManager
from decimal import Decimal

class UserManager(TreeManager, BaseUserManager):
    def create_user(self, username, password=None, **extra_fields):
        if not username:
            raise ValueError('The Username must be set')
        user = self.model(username=username, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, username, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('role', 'super_admin')

        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser must have is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser must have is_superuser=True.')

        return self.create_user(username, password, **extra_fields)

    def get_by_natural_key(self, username):
        return self.get(username=username)

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
    created_by = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='created_users')

    objects = UserManager()  # Combined manager for auth and MPTT

    class MPTTMeta:
        order_insertion_by = ['username']

    def __str__(self):
        return self.username