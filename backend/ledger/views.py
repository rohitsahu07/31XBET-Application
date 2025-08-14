from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page
from .models import Transaction
from .serializers import TransactionSerializer
from django.db import models

class LedgerViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = TransactionSerializer
    permission_classes = [IsAuthenticated]

    @method_decorator(cache_page(60))  # Cache for 1 min for speed
    def dispatch(self, *args, **kwargs):
        return super().dispatch(*args, **kwargs)

    def get_queryset(self):
        user = self.request.user
        descendants = user.get_descendants(include_self=True).values_list('id', flat=True)
        return Transaction.objects.filter(models.Q(from_user_id__in=descendants) | models.Q(to_user_id__in=descendants)).order_by('-timestamp')