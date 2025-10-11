from django.contrib import admin
from .models import BetRecord

@admin.register(BetRecord)
class BetRecordAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "user",
        "description",
        "won_by",            # 🆕 Show this column in admin table
        "prev_balance",
        "credit",
        "debit",
        "balance",
        "status",
        "date_time",
    )
    list_filter = ("status", "won_by", "user")  # 🆕 Filter by who won
    search_fields = ("user__username", "description", "won_by")
    ordering = ("-date_time",)
    readonly_fields = ("id",)
