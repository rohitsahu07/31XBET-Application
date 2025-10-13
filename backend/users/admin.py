# backend/users/admin.py
from django.contrib import admin
from .models import User

@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ("username", "role", "chip_code", "parent", "get_created_by", "balance")
    search_fields = ("username", "chip_code")
    list_filter = ("role",)
    readonly_fields = ("balance", "chip_code",)  # balance is managed by flows; chip_code auto

    fieldsets = (
        (None, {
            "fields": ("username", "password")
        }),
        ("Profile", {
            "fields": ("role", "parent", "created_by", "chip_code", "balance")
        }),
        ("Permissions", {
            "fields": ("is_active", "is_staff", "is_superuser", "groups", "user_permissions")
        }),
        ("Important dates", {
            "fields": ("last_login", "date_joined")
        }),
    )

    def get_created_by(self, obj):
        return obj.created_by.username if obj.created_by else "None"
    get_created_by.short_description = "Created By"
