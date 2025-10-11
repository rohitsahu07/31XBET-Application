from rest_framework import viewsets, status
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from django.contrib.auth import get_user_model
from .serializers import UserSerializer

User = get_user_model()

class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all().order_by('id')
    serializer_class = UserSerializer

    def get_permissions(self):
        if self.action in ['create']:
            return [AllowAny()]  # allow registration
        return [IsAuthenticated()]

    def list(self, request):
        """
        Return current user info if not superuser, or all users if admin.
        """
        user = request.user
        if user.is_superuser:
            queryset = User.objects.all()
        else:
            queryset = User.objects.filter(id=user.id)
        serializer = self.get_serializer(queryset, many=True)
        print("📢 [UserViewSet] Returning user data:", serializer.data)
        return Response(serializer.data)

    def create(self, request):
        """
        Allow admin to create new user.
        """
        if not request.user.is_superuser:
            return Response({"error": "Only admin can create users"}, status=status.HTTP_403_FORBIDDEN)
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            print("✅ [UserViewSet] Created new user:", serializer.data)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        print("❌ [UserViewSet] Error creating user:", serializer.errors)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)