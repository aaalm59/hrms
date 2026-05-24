from django.contrib import admin
from .models import ActivityLog, LoginLog


@admin.register(ActivityLog)
class ActivityLogAdmin(admin.ModelAdmin):
    list_display = ["user", "company", "action", "model_name", "object_id", "ip_address", "created_at"]
    list_filter = ["company", "action", "model_name"]
    search_fields = ["user__email", "model_name", "description"]
    date_hierarchy = "created_at"
    ordering = ["-created_at"]
    readonly_fields = ["user", "company", "action", "model_name", "object_id", "description", "ip_address", "user_agent", "created_at"]

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False


@admin.register(LoginLog)
class LoginLogAdmin(admin.ModelAdmin):
    list_display = ["email", "user", "status", "ip_address", "device", "created_at"]
    list_filter = ["status"]
    search_fields = ["email", "ip_address"]
    date_hierarchy = "created_at"
    ordering = ["-created_at"]
    readonly_fields = ["user", "email", "status", "ip_address", "device", "created_at"]

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False
