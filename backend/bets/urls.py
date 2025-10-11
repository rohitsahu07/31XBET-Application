from rest_framework.routers import DefaultRouter
from .views import BetRecordViewSet

router = DefaultRouter()
router.register(r'', BetRecordViewSet, basename='betrecord')

urlpatterns = router.urls
