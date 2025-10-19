from django.urls import path, include
from rest_framework.routers import DefaultRouter

router = DefaultRouter()

# Try to register the ViewSet if available
try:
    from .views import BetRecordViewSet
    router.register(r"records", BetRecordViewSet, basename="bet-records")
except Exception:
    pass

from . import views

urlpatterns = [
    path("", include(router.urls)),
    path("profile/", views.profile, name="profile"),
    path("current-round/", views.current_round, name="current-round"),
    path("place-bet/", views.place_bet, name="place-bet"),
    path("feed/last-ten/", views.last_ten_feed, name="last-ten-feed"),
]
