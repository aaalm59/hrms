from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, OTPVerification


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ["email", "first_name", "last_name", "company", "primary_role", "status", "is_super_admin"]
    list_filter = ["is_super_admin", "status", "company"]
    search_fields = ["email", "first_name", "last_name"]
    ordering = ["-date_joined"]
    fieldsets = BaseUserAdmin.fieldsets + (
        ("HRMS", {"fields": ("phone", "avatar", "company", "status", "is_super_admin", "is_mfa_enabled")}),
    )


@admin.register(OTPVerification)
class OTPVerificationAdmin(admin.ModelAdmin):
    list_display = ["user", "purpose", "is_used", "expires_at"]
    list_filter = ["purpose", "is_used"]
