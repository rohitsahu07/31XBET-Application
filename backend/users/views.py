# backend/users/views.py
from rest_framework import viewsets, status
from rest_framework.views import APIView
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.contrib.auth import get_user_model
from decimal import Decimal
from ledger.models import Transaction
from .serializers import UserSerializer
from rest_framework_simplejwt.tokens import RefreshToken  # ✅ import for logout

User = get_user_model()


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

    def list(self, request):
        user = request.user
        if user.is_superuser:
            queryset = User.objects.exclude(id=user.id)
        else:
            queryset = User.objects.filter(id=user.id)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    def create(self, request):
        """Admin creates user and optionally grants initial coins (logs a Transaction)."""
        if not request.user.is_superuser:
            return Response({"error": "Only admin can create users"}, status=status.HTTP_403_FORBIDDEN)

        serializer = self.get_serializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        # ✅ Create user instance but hash password manually
        password = request.data.get("password")
        user = serializer.save(created_by=request.user)

        if password:
            user.set_password(password)  # ✅ Hash password properly
            user.save()

        # ✅ Handle optional initial balance
        initial_balance = request.data.get("initial_balance")
        if initial_balance:
            try:
                amount = Decimal(initial_balance)
                prev = user.balance
                user.balance = prev + amount
                user.save()

                Transaction.objects.create(
                    from_user=request.user,
                    to_user=user,
                    amount=amount,
                    type='grant',
                    description=f"Initial chips granted to {user.username}",
                    prev_balance=prev,
                    credit=amount,
                    debit=Decimal("0.00"),
                    balance=user.balance,
                )
            except Exception as e:
                print("⚠️ Invalid balance value:", e)

        return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['post'])
    def grant_coins(self, request):
        """Admin grants chips to a user and logs a Transaction (for Statement)."""
        if not request.user.is_superuser:
            return Response({"error": "Only admin can grant coins"}, status=status.HTTP_403_FORBIDDEN)

        user_id = request.data.get("user_id")
        amount = Decimal(request.data.get("amount", 0))

        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)

        prev = user.balance
        user.balance = prev + amount
        user.save()

        Transaction.objects.create(
            from_user=request.user,
            to_user=user,
            amount=amount,
            type='grant',
            description=f"Chips credited by {request.user.username} to {user.username}",
            prev_balance=prev,
            credit=amount,
            debit=Decimal("0.00"),
            balance=user.balance,
        )

        return Response({"success": f"{amount} coins added to {user.username}."}, status=status.HTTP_200_OK)

    def destroy(self, request, *args, **kwargs):
        if not request.user.is_superuser:
            return Response({"error": "Only admin can delete users"}, status=status.HTTP_403_FORBIDDEN)
        user = self.get_object()
        user.delete()
        return Response({"success": f"User '{user.username}' deleted successfully."}, status=status.HTTP_200_OK)
