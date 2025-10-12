from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import BetRecordViewSet, current_round, place_bet

router = DefaultRouter()
router.register(r'', BetRecordViewSet, basename='betrecord')

urlpatterns = [
    path('current-round/', current_round, name='current-round'),
    path('place-bet/', place_bet, name='place-bet'),
    path('', include(router.urls)),
]
