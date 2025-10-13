from django.contrib import admin
from .models import BetRecord, RoundFeed


@admin.register(BetRecord)
class BetRecordAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "round_id", "player", "amount", "created_at")
    list_filter = ("player", "created_at")
    search_fields = ("round_id", "user__username")
    ordering = ("-created_at",)


@admin.register(RoundFeed)
class RoundFeedAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "item_type",
        "round_id",
        "official_winner",
        "player_choice",
        "bet_amount",
        "resolver",
        "final_result",
        "created_at",
    )
    list_filter = ("item_type", "resolver", "official_winner")
    search_fields = ("round_id",)
    ordering = ("-created_at",)
