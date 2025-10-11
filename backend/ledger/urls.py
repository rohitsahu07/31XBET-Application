# backend/ledger/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import LedgerViewSet, StatementView

# DRF router for normal ledger records
router = DefaultRouter()
router.register(r'ledger', LedgerViewSet, basename='ledger')  # renamed for clarity

urlpatterns = [
    # ✅ API endpoint for Statement
    path('statement/', StatementView.as_view(), name='statement'),

    # ✅ Include DRF router (will create /api/ledger/ledger/ endpoints)
    path('', include(router.urls)),
]
