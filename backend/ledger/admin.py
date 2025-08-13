from django.contrib import admin
from .models import Transaction

@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display = (
        'id',
        'from_user',
        'to_user',
        'amount',
        'type',
        'timestamp',
        'description',
    )
    list_filter = ('type', 'timestamp')  # Sidebar filters
    search_fields = ('from_user__username', 'to_user__username', 'description')
    ordering = ('-timestamp',)  # Show latest transactions first
    readonly_fields = ('timestamp',)  # Auto-set timestamp is read-only
