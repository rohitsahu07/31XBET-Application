# backend/users/models.py

from __future__ import annotations

import random
import uuid  # ← ADD
from decimal import Decimal

from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.core.validators import MinValueValidator
from django.db import models
from django.db.models import Q
from mptt.models import MPTTModel, TreeForeignKey
from mptt.managers import TreeManager


# ------------------------------
# Helpers
# ------------------------------
def _gen_chip_code() -> str:
    """Generate a short unique chip code like CL6730."""
    return f"CL{random.randint(1000, 9999)}"


# ------------------------------
# User Manager
# ------------------------------
class UserManager(TreeManager, BaseUserManager):
    def create_user(self, username, password=None, **extra_fields):
        if not username:
            raise ValueError("Username must be set")

        # Any non-superuser creation defaults to a normal user
        extra_fields.setdefault("role", "user")

        user = self.model(username=username, **extra_fields)
        user.set_password(password)

        # Ensure chip_code exists
        if not getattr(user, "chip_code", None):
            user._ensure_chip_code()

        user.save(using=self._db)
        return user

    def create_superuser(self, username, password=None, **extra_fields):
        # manage.py createsuperuser should always create the single admin
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("role", "admin")

        if extra_fields.get("is_staff") is not True:
            raise ValueError("Superuser must have is_staff=True.")
        if extra_fields.get("is_superuser") is not True:
            raise ValueError("Superuser must have is_superuser=True.")

        return self.create_user(username, password, **extra_fields)

    def get_by_natural_key(self, username):
        return self.get(username=username)


# ------------------------------
# User Model
# ------------------------------
class User(AbstractUser, MPTTModel):
    ROLE_CHOICES = (
        ("admin", "Admin"),
        ("user", "User"),
    )

    # Core fields
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default="user", db_index=True)
    balance = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0.00"))],
    )

    # New: rotating per-login session key (used to invalidate other devices)
    session_key = models.UUIDField(default=uuid.uuid4, editable=False)  # ← ADD

    # Optional hierarchy (downlines / organization tree)
    parent = TreeForeignKey(
        "self",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="children",
    )

    # Who created this user (audit)
    created_by = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_users",
    )

    # Unique chip code (e.g., CL6730)
    chip_code = models.CharField(max_length=10, unique=True, blank=True, null=True)

    objects = UserManager()

    class MPTTMeta:
        order_insertion_by = ["username"]

    class Meta:
        constraints = [
            # Enforce a single admin account at the DB level
            models.UniqueConstraint(
                fields=["role"],
                condition=Q(role="admin"),
                name="only_one_admin_role",
            ),
        ]

    def __str__(self):
        return f"{self.username} ({self.role})"

    # --------------------------
    # Internal helpers
    # --------------------------
    def _ensure_chip_code(self):
        """Generate a unique chip code if missing."""
        if self.chip_code:
            return
        # Loop until unique (space is large, collisions rare)
        while True:
            code = _gen_chip_code()
            if not User.objects.filter(chip_code=code).exists():
                self.chip_code = code
                break

    def save(self, *args, **kwargs):
        if not self.chip_code:
            self._ensure_chip_code()
        super().save(*args, **kwargs)
