from django.http import JsonResponse
from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from django.db import transaction
from .models import User
from .serializers import UserSerializer, GrantCoinSerializer
from ledger.models import Transaction

def home(request):
    return JsonResponse({"message": "Welcome to the Betting App API"})

class UserPermission(IsAuthenticated):
    def has_permission(self, request, view):
        user = request.user
        if request.method == 'GET':
            return True
        if user.role == 'super_admin':
            return True
        if user.role == 'master_admin' and view.action == 'create' and request.data.get('role') == 'admin':
            return True
        if user.role == 'admin' and view.action == 'create' and request.data.get('role') == 'client':
            return True
        return False

class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [UserPermission]

    def get_queryset(self):
        return self.request.user.get_descendants(include_self=True)

    def perform_create(self, serializer):
        serializer.save(parent=self.request.user)

    @action(detail=False, methods=['post'])
    def grant_coins(self, request):
        serializer = GrantCoinSerializer(data=request.data)
        if serializer.is_valid():
            with transaction.atomic():
                to_user = User.objects.get(id=serializer.data['user_id'])
                amount = serializer.data['amount']
                if to_user.get_parent() != request.user or request.user.balance < amount:
                    return Response({'error': 'Invalid grant'}, status=status.HTTP_400_BAD_REQUEST)
                request.user.balance -= amount
                to_user.balance += amount
                request.user.save()
                to_user.save()
                Transaction.objects.create(from_user=request.user, to_user=to_user, amount=amount, type='grant')
            return Response({'success': 'Coins granted'})
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)