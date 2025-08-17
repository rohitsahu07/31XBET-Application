# backend/users/views.py (updated perform_create to set created_by)

from rest_framework_simplejwt.views import TokenBlacklistView
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db import transaction
from .models import User
from .serializers import UserSerializer, GrantCoinSerializer
from ledger.models import Transaction

class UserPermission(IsAuthenticated):
    def has_permission(self, request, view):
        user = request.user
        if request.method == 'GET':
            return True
        if view.action == 'create':
            role = request.data.get('role')
            if user.role == 'super_admin' and role == 'master_admin':
                return True
            if user.role == 'master_admin' and role == 'admin':
                return True
            if user.role == 'admin' and role == 'client':
                return True
        return False

class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [UserPermission]

    def get_queryset(self):
        return self.request.user.get_descendants(include_self=True)

    def perform_create(self, serializer):
        user = self.request.user
        role = serializer.validated_data['role']
        # Enforce hierarchy
        if user.role == 'super_admin' and role == 'master_admin':
            pass
        elif user.role == 'master_admin' and role == 'admin':
            pass
        elif user.role == 'admin' and role == 'client':
            pass
        else:
            raise serializers.ValidationError(f"{user.role} can only create {self.get_allowed_child_role(user.role)}")
        serializer.save(parent=user, created_by=user)

    def get_allowed_child_role(self, role):
        if role == 'super_admin':
            return 'master_admin'
        if role == 'master_admin':
            return 'admin'
        if role == 'admin':
            return 'client'
        return None

    @action(detail=False, methods=['post'])
    def grant_coins(self, request):
        serializer = GrantCoinSerializer(data=request.data)
        if serializer.is_valid():
            with transaction.atomic():
                to_user = User.objects.get(id=serializer.data['user_id'])
                amount = serializer.data['amount']
                if to_user.parent != request.user or request.user.balance < amount:
                    return Response({'error': 'Invalid grant'}, status=status.HTTP_400_BAD_REQUEST)
                request.user.balance -= amount
                to_user.balance += amount
                request.user.save()
                to_user.save()
                Transaction.objects.create(from_user=request.user, to_user=to_user, amount=amount, type='grant')
            return Response({'success': 'Coins granted'})
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    

class LogoutView(TokenBlacklistView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            refresh_token = request.data["refresh"]
            token = RefreshToken(refresh_token)
            token.blacklist()
            return Response("Successful Logout", status=status.HTTP_200_OK)
        except Exception as e:
            return Response(status=status.HTTP_400_BAD_REQUEST)