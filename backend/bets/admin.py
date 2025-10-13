# backend/bets/admin.py
from django.contrib import admin
from .models import Round, Bet

@admin.register(Round)
class RoundAdmin(admin.ModelAdmin):
    list_display = ("round_id", "game", "winner", "resolver", "started_at", "ended_at")
    search_fields = ("round_id",)
    list_filter = ("game", "resolver", "winner")

@admin.register(Bet)
class BetAdmin(admin.ModelAdmin):
    list_display = ("user", "round", "selection", "stake", "status", "payout", "net", "created_at")
    search_fields = ("user__username", "round__round_id")
    list_filter = ("status", "selection")
