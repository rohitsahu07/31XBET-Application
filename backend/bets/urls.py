from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import BetViewSet, CricketMatchesView

router = DefaultRouter()
router.register(r'', BetViewSet, basename='bet')

urlpatterns = router.urls + [
    path('cricket/matches/', CricketMatchesView.as_view(), name='cricket_matches'),
]