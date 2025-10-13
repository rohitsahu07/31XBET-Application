from django.contrib import admin
from .models import Transaction

@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display = (
        "id", "to_user", "from_user", "type", "amount",
        "credit", "debit", "prev_balance", "balance", "timestamp",
    )
    list_filter = ("type", "timestamp")
    search_fields = ("to_user__username", "from_user__username", "description", "round__round_id")
    readonly_fields = ("prev_balance", "credit", "debit", "balance", "timestamp")
    autocomplete_fields = ("from_user", "to_user", "round", "bet")
