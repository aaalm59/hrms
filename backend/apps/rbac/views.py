from rest_framework import viewsets
from apps.core.permissions import IsCompanyAdmin, IsSuperAdmin
from .models import Role, Permission, UserRole
from .serializers import RoleSerializer, PermissionSerializer, UserRoleSerializer


class RoleViewSet(viewsets.ModelViewSet):
    serializer_class = RoleSerializer
    permission_classes = [IsCompanyAdmin]

    def get_queryset(self):
        if self.request.user.is_super_admin:
            return Role.objects.all()
        return Role.objects.filter(company=self.request.user.company)

    def perform_create(self, serializer):
        serializer.save(company=self.request.user.company)


class PermissionViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Permission.objects.all()
    serializer_class = PermissionSerializer
    permission_classes = [IsCompanyAdmin]


class UserRoleViewSet(viewsets.ModelViewSet):
    serializer_class = UserRoleSerializer
    permission_classes = [IsCompanyAdmin]

    def get_queryset(self):
        if self.request.user.is_super_admin:
            return UserRole.objects.all()
        return UserRole.objects.filter(user__company=self.request.user.company)

    def perform_create(self, serializer):
        serializer.save(assigned_by=self.request.user)
