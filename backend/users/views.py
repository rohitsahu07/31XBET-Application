# backend/users/views.py
from rest_framework import viewsets, status
from rest_framework.views import APIView
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.contrib.auth import get_user_model
from decimal import Decimal
from django.utils import timezone

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

def _opening_balance_description(admin_user: User, new_user: User) -> str:
    # Format similar to your screenshot text
    # Example: "Opening Balance By 158 Deepu90 (Ma158) To 6730 Rm (CL6730) [158 Deepu90,Ma158]"
    # We don't have short codes like (Ma158), so we keep usernames and chip code.
    return (
        f"Opening Balance By {admin_user.id} {admin_user.username} "
        f"To {new_user.id} Rm ({new_user.chip_code}) "
        f"[{admin_user.id} {admin_user.username}]"
    )

def _deposit_description(admin_user: User, target_user: User, amount: Decimal) -> str:
    return (
        f"Chips credited to {target_user.id} Rm ({target_user.chip_code}) by "
        f"{admin_user.id} {admin_user.username} (₹{amount})"
    )

def _withdraw_description(admin_user: User, target_user: User, amount: Decimal) -> str:
    return (
        f"Chips debited from {target_user.id} Rm ({target_user.chip_code}) by "
        f"{admin_user.id} {admin_user.username} (₹{amount})"
    )

# ✅ Change Password API
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


# ✅ Logout API (Blacklist token)
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


# ✅ User Management
class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all().order_by('id')
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['get'])
    def me(self, request):
        """Return current user profile"""
        user = request.user
        serializer = self.get_serializer(user, context={"request": request})
        return Response(serializer.data)

    # ✅ Secure list: Admin sees all (excluding superuser), user sees only self
    def list(self, request):
        user = request.user
        if user.is_superuser:
            queryset = User.objects.exclude(is_superuser=True).order_by('id')
        else:
            queryset = User.objects.filter(id=user.id)
        serializer = self.get_serializer(queryset, many=True, context={"request": request})
        return Response(serializer.data)

    # ✅ Create user with chip code, password, initial balance (Admin only)
    #    AND save an Opening Balance Transaction (type='grant')
    def create(self, request):
        if not request.user.is_superuser:
            return Response({"error": "Only admin can create users"}, status=status.HTTP_403_FORBIDDEN)

        username = request.data.get("username")
        password = request.data.get("password") or generate_random_password()
        balance = Decimal(str(request.data.get("balance", "0.00")))
        chip_code = generate_chip_code()

        # create user
        user = User.objects.create(
            username=username,
            created_by=request.user,
            role="user",                  # fixed: use "user"
            chip_code=chip_code,          # set explicit code so response matches DB
        )
        user.set_password(password)
        # compute opening balance and persist on user
        user.balance = balance
        user.save()

        # 💰 Opening Balance transaction (grant)
        if balance > 0:
            prev = Decimal("0.00")
            new_bal = balance
            Transaction.objects.create(
                from_user=request.user,
                to_user=user,
                amount=balance,
                type="grant",
                description=_opening_balance_description(request.user, user),
                prev_balance=prev,
                credit=balance,
                debit=Decimal("0.00"),
                balance=new_bal,
            )

        # Response unchanged (keep your original keys)
        return Response({
            "message": "User created successfully!",
            "user": UserSerializer(user, context={"request": request}).data,
            "login_details": {
                "url": "http://jsm99.pro/",
                "chip_code": user.chip_code,   # ensure matches saved user
                "username": username,
                "password": password,
                "balance": str(balance)
            }
        }, status=status.HTTP_201_CREATED)

    # ✅ Deposit chips (+ Transaction type='grant')
    @action(detail=True, methods=['post'])
    def deposit(self, request, pk=None):
        user = self.get_object()
        amount = Decimal(str(request.data.get('amount', 0)))
        prev = user.balance
        user.balance = (user.balance + amount)
        user.save()

        # 💰 record deposit
        if amount > 0:
            Transaction.objects.create(
                from_user=request.user,
                to_user=user,
                amount=amount,
                type="grant",
                description=_deposit_description(request.user, user, amount),
                prev_balance=prev,
                credit=amount,
                debit=Decimal("0.00"),
                balance=user.balance,
            )

        # response unchanged
        return Response({"message": f"₹{amount} added successfully", "balance": user.balance})

    # ✅ Withdraw chips (+ Transaction type='debit')
    @action(detail=True, methods=['post'])
    def withdraw(self, request, pk=None):
        user = self.get_object()
        amount = Decimal(str(request.data.get('amount', 0)))
        if user.balance < amount:
            return Response({"error": "Insufficient balance"}, status=400)

        prev = user.balance
        user.balance = (user.balance - amount)
        user.save()

        # 💰 record withdrawal
        if amount > 0:
            Transaction.objects.create(
                from_user=request.user,
                to_user=user,
                amount=amount,
                type="debit",
                description=_withdraw_description(request.user, user, amount),
                prev_balance=prev,
                credit=Decimal("0.00"),
                debit=amount,
                balance=user.balance,
            )

        # response unchanged
        return Response({"message": f"₹{amount} withdrawn successfully", "balance": user.balance})

    # ✅ Reset password (Admin only)
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

    # ✅ Edit username
    @action(detail=True, methods=['post'])
    def edit_name(self, request, pk=None):
        user = self.get_object()
        new_name = request.data.get('username')
        if not new_name:
            return Response({"error": "Username required"}, status=400)
        user.username = new_name
        user.save()
        return Response({"message": "Username updated successfully", "username": user.username})
