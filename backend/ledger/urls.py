from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import LedgerViewSet, StatementView, BetLedgerView

# DRF router for raw transactions (optional list/grid views)
router = DefaultRouter()
router.register(r'ledger', LedgerViewSet, basename='ledger')

urlpatterns = [
    # ✅ Account Statement (combined: transfers + bets)
    path('statement/', StatementView.as_view(), name='statement'),
    # ✅ MY LEDGER (bets only, profit/loss)
    path('my-ledger/', BetLedgerView.as_view(), name='my-ledger'),
    # ✅ Router endpoints for raw Transaction model
    path('', include(router.urls)),
]
