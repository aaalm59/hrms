from rest_framework import generics, status, permissions
from django.db import models as django_models
models = django_models
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model

from apps.core.permissions import IsSuperAdmin
from .serializers import (
    CustomTokenObtainPairSerializer,
    UserSerializer,
    CreateCompanyUserSerializer,
    ChangePasswordSerializer,
    ForgotPasswordSerializer,
    ResetPasswordSerializer,
)

User = get_user_model()


class LoginView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer
    permission_classes = [permissions.AllowAny]


class LogoutView(APIView):
    def post(self, request):
        try:
            token = RefreshToken(request.data["refresh"])
            token.blacklist()
            return Response({"detail": "Logged out successfully."})
        except Exception:
            return Response({"detail": "Invalid token."}, status=status.HTTP_400_BAD_REQUEST)


class MeView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer

    def get_object(self):
        return self.request.user


class CreateCompanyUserView(generics.CreateAPIView):
    """Super Admin creates a company admin user."""
    serializer_class = CreateCompanyUserSerializer
    permission_classes = [IsSuperAdmin]


class ChangePasswordView(APIView):
    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        request.user.set_password(serializer.validated_data["new_password"])
        request.user.save()
        return Response({"detail": "Password changed successfully."})


class ForgotPasswordView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = ForgotPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        from .tasks import send_password_reset_email
        send_password_reset_email.delay(serializer.validated_data["email"])
        return Response({"detail": "If this email exists, a reset link has been sent."})


class ResetPasswordView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = ResetPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return Response({"detail": "Password reset successful."})


class UserListView(generics.ListAPIView):
    """Super Admin: list all platform users."""
    serializer_class = UserSerializer
    permission_classes = [IsSuperAdmin]

    def get_queryset(self):
        from rest_framework import filters
        qs = User.objects.select_related("company").prefetch_related("roles__role")
        company_id = self.request.query_params.get("company_id")
        search = self.request.query_params.get("search", "")
        status_filter = self.request.query_params.get("status", "")
        role_filter = self.request.query_params.get("role", "")
        super_admin_filter = self.request.query_params.get("is_super_admin", "")
        if company_id:
            qs = qs.filter(company_id=company_id)
        if search:
            qs = qs.filter(
                models.Q(email__icontains=search) |
                models.Q(first_name__icontains=search) |
                models.Q(last_name__icontains=search)
            )
        if status_filter:
            qs = qs.filter(status=status_filter)
        if role_filter:
            qs = qs.filter(roles__role__name=role_filter)
        if super_admin_filter == "false":
            qs = qs.filter(is_super_admin=False)
        elif super_admin_filter == "true":
            qs = qs.filter(is_super_admin=True)
        return qs.distinct().order_by("-date_joined")


class ImpersonateView(APIView):
    """Super Admin: generate JWT tokens for a company's admin user (Login As)."""
    permission_classes = [IsSuperAdmin]

    def post(self, request, company_id):
        from apps.companies.models import Company
        try:
            company = Company.objects.get(id=company_id)
        except Company.DoesNotExist:
            return Response({"detail": "Company not found."}, status=status.HTTP_404_NOT_FOUND)

        # Find the company admin user (most recently joined)
        admin_user = User.objects.filter(
            company=company, is_super_admin=False
        ).order_by("-date_joined").first()

        if not admin_user:
            return Response({"detail": "No users found in this company."}, status=status.HTTP_400_BAD_REQUEST)

        refresh = RefreshToken.for_user(admin_user)
        refresh["email"] = admin_user.email
        refresh["full_name"] = admin_user.get_full_name()
        refresh["is_super_admin"] = False
        refresh["company_id"] = admin_user.company_id
        refresh["company_name"] = admin_user.company.name if admin_user.company else None
        refresh["roles"] = list(admin_user.roles.values_list("role__name", flat=True))
        refresh["impersonated_by"] = request.user.email

        return Response({
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            "user_email": admin_user.email,
            "user_name": admin_user.get_full_name(),
            "company": company.name,
        })


class ResetUserPasswordView(APIView):
    """Super Admin: reset any user's password."""
    permission_classes = [IsSuperAdmin]

    def post(self, request, user_id):
        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({"detail": "User not found."}, status=status.HTTP_404_NOT_FOUND)
        new_password = request.data.get("new_password")
        if not new_password or len(new_password) < 6:
            return Response({"detail": "Password must be at least 6 characters."}, status=status.HTTP_400_BAD_REQUEST)
        user.set_password(new_password)
        user.save()
        return Response({"detail": f"Password reset for {user.email}."})
