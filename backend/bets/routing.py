# backend/bets/routing.py
from django.urls import path
from .views import UserProfileConsumer

websocket_urlpatterns = [
    path("ws/profile/", UserProfileConsumer.as_asgi()),
]
