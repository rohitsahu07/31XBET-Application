from rest_framework import viewsets, status
from rest_framework.views import APIView
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.contrib.auth import get_user_model
from decimal import Decimal
from ledger.models import Transaction
from .serializers import UserSerializer
from rest_framework_simplejwt.tokens import RefreshToken
import random, string

User = get_user_model()


def generate_chip_code():
    """Generate unique chip code like CL6915"""
    return "CL" + str(random.randint(1000, 9999))


def generate_random_password():
    """Generate random 6-character password"""
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))


class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        old_password = request.data.get("old_password")
        new_password = request.data.get("new_password")

        if not user.check_password(old_password):
            return Response({"detail": "Incorrect current password"}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(new_password)
        user.save()
        return Response({"detail": "Password changed successfully"}, status=status.HTTP_200_OK)


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            refresh_token = request.data.get("refresh")
            if not refresh_token:
                return Response({"detail": "Refresh token required."}, status=status.HTTP_400_BAD_REQUEST)
            
            token = RefreshToken(refresh_token)
            token.blacklist()
            return Response({"detail": "Logout successful."}, status=status.HTTP_205_RESET_CONTENT)
        except Exception as e:
            print("Logout error:", e)
            return Response({"detail": "Invalid token."}, status=status.HTTP_400_BAD_REQUEST)


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all().order_by('id')
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['get'])
    def me(self, request):
        user = request.user
        serializer = self.get_serializer(user)
        return Response(serializer.data)

    # ✅ Filter out admin from list
    def list(self, request):
        queryset = User.objects.exclude(is_superuser=True).order_by('id')
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    # ✅ Create user with chip code, password, and initial balance
    def create(self, request):
        if not request.user.is_superuser:
            return Response({"error": "Only admin can create users"}, status=status.HTTP_403_FORBIDDEN)

        username = request.data.get("username")
        password = request.data.get("password") or generate_random_password()
        balance = Decimal(request.data.get("balance", "0.00"))

        chip_code = generate_chip_code()

        user = User.objects.create(
            username=username,
            created_by=request.user,
            role="client"
        )
        user.set_password(password)
        user.save()

        user.balance = balance
        user.save()

        return Response({
            "message": "User created successfully!",
            "user": UserSerializer(user).data,
            "login_details": {
                "url": "http://jsm99.pro/",
                "chip_code": chip_code,
                "username": username,
                "password": password,
                "balance": str(balance)
            }
        }, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def deposit(self, request, pk=None):
        user = self.get_object()
        amount = Decimal(request.data.get('amount', 0))
        user.balance += amount
        user.save()
        return Response({"message": f"₹{amount} added successfully", "balance": user.balance})

    @action(detail=True, methods=['post'])
    def withdraw(self, request, pk=None):
        user = self.get_object()
        amount = Decimal(request.data.get('amount', 0))
        if user.balance < amount:
            return Response({"error": "Insufficient balance"}, status=400)
        user.balance -= amount
        user.save()
        return Response({"message": f"₹{amount} withdrawn successfully", "balance": user.balance})

    @action(detail=True, methods=['post'])
    def reset_password(self, request, pk=None):
        user = self.get_object()
        new_password = generate_random_password()
        user.set_password(new_password)
        user.save()
        return Response({
            "message": "Password reset successfully",
            "new_password": new_password
        })

    @action(detail=True, methods=['post'])
    def edit_name(self, request, pk=None):
        user = self.get_object()
        new_name = request.data.get('username')
        if not new_name:
            return Response({"error": "Username required"}, status=400)
        user.username = new_name
        user.save()
        return Response({"message": "Username updated successfully", "username": user.username})