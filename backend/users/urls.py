from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import UserViewSet, LogoutView

router = DefaultRouter()
router.register(r'', UserViewSet)

urlpatterns = router.urls + [
    path('logout/', LogoutView.as_view(), name='logout'),
]