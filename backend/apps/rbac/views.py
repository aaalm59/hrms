from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q
from apps.core.permissions import IsCompanyAdmin, IsSuperAdmin
from .models import Role, Permission, UserRole, RolePermission
from .serializers import RoleSerializer, PermissionSerializer, UserRoleSerializer


class RoleViewSet(viewsets.ModelViewSet):
    serializer_class = RoleSerializer
    permission_classes = [IsCompanyAdmin]

    def get_queryset(self):
        if self.request.user.is_super_admin:
            company_id = self.request.query_params.get("company_id")
            if company_id:
                return Role.objects.filter(company_id=company_id).order_by("display_name", "id")
            return Role.objects.all().order_by("company_id", "display_name", "id")
        return Role.objects.filter(company=self.request.user.company).order_by("display_name", "id")

    def perform_create(self, serializer):
        if self.request.user.is_super_admin:
            company_id = self.request.data.get("company")
            serializer.save(company_id=company_id)
        else:
            serializer.save(company=self.request.user.company)

    @action(detail=True, methods=["post"])
    def assign_permissions(self, request, pk=None):
        """Bulk-set permissions for a role. Replaces existing assignments."""
        role = self.get_object()
        permission_ids = request.data.get("permission_ids", [])
        RolePermission.objects.filter(role=role).delete()
        created = 0
        for perm_id in permission_ids:
            try:
                perm = Permission.objects.get(id=perm_id)
                RolePermission.objects.create(role=role, permission=perm)
                created += 1
            except Permission.DoesNotExist:
                pass
        return Response({"detail": f"{created} permissions assigned to '{role.display_name}'."})

    @action(detail=True, methods=["get"])
    def permissions(self, request, pk=None):
        """Get all permissions assigned to a role."""
        role = self.get_object()
        perms = role.role_permissions.select_related("permission")
        return Response([
            {"id": rp.permission.id, "module": rp.permission.module, "action": rp.permission.action}
            for rp in perms
        ])


class PermissionViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = PermissionSerializer
    permission_classes = [IsCompanyAdmin]

    def get_queryset(self):
        if self.request.user.is_super_admin:
            company_id = self.request.query_params.get("company_id")
            if company_id:
                return Permission.objects.filter(Q(company_id=company_id) | Q(company__isnull=True)).order_by("module", "action")
            return Permission.objects.all().order_by("module", "action")
        return Permission.objects.filter(Q(company=self.request.user.company) | Q(company__isnull=True)).order_by("module", "action")


class UserRoleViewSet(viewsets.ModelViewSet):
    serializer_class = UserRoleSerializer
    permission_classes = [IsCompanyAdmin]

    def get_queryset(self):
        if self.request.user.is_super_admin:
            return UserRole.objects.all()
        return UserRole.objects.filter(user__company=self.request.user.company)

    def perform_create(self, serializer):
        serializer.save(assigned_by=self.request.user)
