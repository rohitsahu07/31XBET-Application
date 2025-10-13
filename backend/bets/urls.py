from django.urls import path, include
from rest_framework.routers import DefaultRouter

router = DefaultRouter()

# Try to register the ViewSet if available
try:
    from .views import BetRecordViewSet
    router.register(r"records", BetRecordViewSet, basename="bet-records")
except Exception:
    # Optional: add logging if you want
    # import logging; logging.getLogger(__name__).exception("BetRecordViewSet import/register failed")
    pass

from . import views

urlpatterns = [
    # Router endpoints (old CRUD):
    #   /api/bets/records/
    #   /api/bets/records/{id}/
    path("", include(router.urls)),

    # Game + profile endpoints (no extra 'bets/' prefix here!)
    # Final URLs:
    #   /api/bets/profile/
    #   /api/bets/current-round/
    #   /api/bets/place-bet/
    #   /api/bets/feed/last-ten/
    path("profile/", views.profile, name="profile"),
    path("current-round/", views.current_round, name="current-round"),
    path("place-bet/", views.place_bet, name="place-bet"),
    path("feed/last-ten/", views.last_ten_feed, name="last-ten-feed"),
]
