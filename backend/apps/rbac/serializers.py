from rest_framework import serializers
from .models import Role, Permission, UserRole, RolePermission


class PermissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Permission
        fields = "__all__"


class RoleSerializer(serializers.ModelSerializer):
    permissions = serializers.SerializerMethodField()

    class Meta:
        model = Role
        fields = ["id", "name", "display_name", "is_system_role", "description", "permissions"]

    def get_permissions(self, obj):
        perms = obj.role_permissions.select_related("permission")
        return [f"{rp.permission.module}:{rp.permission.action}" for rp in perms]


class UserRoleSerializer(serializers.ModelSerializer):
    role_name = serializers.CharField(source="role.display_name", read_only=True)
    user_email = serializers.CharField(source="user.email", read_only=True)

    class Meta:
        model = UserRole
        fields = ["id", "user", "user_email", "role", "role_name", "assigned_at"]
        read_only_fields = ["id", "assigned_at"]
