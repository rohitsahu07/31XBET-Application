from django.contrib import admin
from mptt.admin import DraggableMPTTAdmin
from .models import User

@admin.register(User)
class CustomUserAdmin(DraggableMPTTAdmin):
    mptt_indent_field = "username"  # Indentation based on username
    list_display = (
        'tree_actions',  # Shows the expand/collapse arrows for hierarchy
        'indented_title',  # Shows username with indentation
        'email',
        'role',
        'balance',
        'is_active',
        'is_staff',
        'date_joined',
    )
    list_display_links = ('indented_title',)
    list_filter = ('role', 'is_active', 'is_staff')
    search_fields = ('username', 'email', 'role')
    ordering = ('username',)

    fieldsets = (
        (None, {
            'fields': ('username', 'email', 'password', 'role', 'parent', 'balance')
        }),
        ('Permissions', {
            'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')
        }),
        ('Important dates', {
            'fields': ('last_login', 'date_joined')
        }),
    )
    readonly_fields = ('last_login', 'date_joined')
