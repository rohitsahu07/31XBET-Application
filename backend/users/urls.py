# backend/users/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import UserViewSet, ChangePasswordView, LogoutView, login_view

router = DefaultRouter()
router.register(r'', UserViewSet, basename='users')

urlpatterns = [
    path('change-password/', ChangePasswordView.as_view(), name='change-password'),
    path('logout/', LogoutView.as_view(), name='logout'), 
    path("login/", login_view, name="users_login"),
    *router.urls,
]
