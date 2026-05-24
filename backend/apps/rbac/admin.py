from django.contrib import admin
from .models import Role, Permission, RolePermission, UserRole


class RolePermissionInline(admin.TabularInline):
    model = RolePermission
    extra = 0
    fields = ["permission"]
    autocomplete_fields = ["permission"]


class UserRoleInline(admin.TabularInline):
    model = UserRole
    extra = 0
    fields = ["user", "assigned_by", "assigned_at"]
    readonly_fields = ["assigned_at"]


@admin.register(Role)
class RoleAdmin(admin.ModelAdmin):
    list_display = ["name", "display_name", "company", "is_system_role", "created_at"]
    list_filter = ["is_system_role", "company"]
    search_fields = ["name", "display_name"]
    ordering = ["name"]
    inlines = [RolePermissionInline, UserRoleInline]


@admin.register(Permission)
class PermissionAdmin(admin.ModelAdmin):
    list_display = ["module", "action", "company", "description"]
    list_filter = ["company", "module", "action"]
    search_fields = ["module", "description"]
    ordering = ["module", "action"]


@admin.register(RolePermission)
class RolePermissionAdmin(admin.ModelAdmin):
    list_display = ["role", "permission"]
    list_filter = ["role__company", "role", "permission__module"]
    search_fields = ["role__name", "permission__module"]


@admin.register(UserRole)
class UserRoleAdmin(admin.ModelAdmin):
    list_display = ["user", "role", "assigned_by", "assigned_at"]
    list_filter = ["role__company", "role"]
    search_fields = ["user__email", "role__name"]
    ordering = ["-assigned_at"]
