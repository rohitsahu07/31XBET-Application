from rest_framework.routers import DefaultRouter
from .views import GameViewSet, BetViewSet

router = DefaultRouter()
router.register(r'games', GameViewSet, basename='game')
router.register(r'', BetViewSet, basename='bet')

urlpatterns = router.urls