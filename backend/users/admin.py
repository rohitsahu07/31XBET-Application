# backend/users/admin.py (updated for created_by display)

from django.contrib import admin
from .models import User

@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ('username', 'role', 'parent', 'get_created_by', 'balance')
    search_fields = ('username', 'role')

    def get_created_by(self, obj):
        return obj.created_by.username if obj.created_by else 'None'
    get_created_by.short_description = 'Created By'