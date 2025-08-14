from django.contrib import admin
from .models import Game, Bet

@admin.register(Game)
class GameAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'type', 'status', 'metadata')
    list_filter = ('type', 'status')  # Adds filters in sidebar
    search_fields = ('name', 'type')  # Searchable fields
    ordering = ('id',)  # Default ordering
    readonly_fields = ('id',)  # Make id read-only

@admin.register(Bet)
class BetAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'game', 'amount', 'status', 'outcome', 'details')
    list_filter = ('status', 'game', 'user')  # Filters in sidebar
    search_fields = ('user__username', 'game__name')  # Search by username or game name
    ordering = ('id',)
    readonly_fields = ('id',)
