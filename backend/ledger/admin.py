from django.contrib import admin
from .models import Transaction

@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display = (
        'id', 'from_user', 'to_user', 'amount', 'type',
        'prev_balance', 'credit', 'debit', 'balance',
        'timestamp', 'description',
    )
    list_filter = ('type', 'timestamp')
    search_fields = ('from_user__username', 'to_user__username', 'description')
    ordering = ('-timestamp',)
    readonly_fields = ('timestamp',)
