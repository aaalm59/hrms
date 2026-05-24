from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Company, CompanySettings, CompanyHoliday

User = get_user_model()


class CompanySettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = CompanySettings
        exclude = ["company"]


class CompanySerializer(serializers.ModelSerializer):
    settings = CompanySettingsSerializer(read_only=True)
    employee_count = serializers.ReadOnlyField()
    subscription_plan = serializers.SerializerMethodField()
    subscription = serializers.SerializerMethodField()

    class Meta:
        model = Company
        fields = "__all__"
        read_only_fields = ["id", "slug", "created_at", "updated_at"]

    def get_subscription_plan(self, obj):
        sub = getattr(obj, "subscription", None)
        if sub:
            return sub.plan.name
        return None

    def get_subscription(self, obj):
        sub = getattr(obj, "subscription", None)
        if not sub:
            return None
        from apps.subscriptions.serializers import SubscriptionSerializer
        return SubscriptionSerializer(sub).data


class CompanyListSerializer(serializers.ModelSerializer):
    employee_count = serializers.ReadOnlyField()
    subscription_plan = serializers.SerializerMethodField()

    class Meta:
        model = Company
        fields = ["id", "name", "slug", "email", "phone", "city", "country", "industry",
                  "status", "employee_count", "subscription_plan", "module_flags", "created_at"]

    def get_subscription_plan(self, obj):
        sub = getattr(obj, "subscription", None)
        return sub.plan.name if sub else None


class CompanyHolidaySerializer(serializers.ModelSerializer):
    class Meta:
        model = CompanyHoliday
        exclude = ["company"]


class CompanyAdminSerializer(serializers.ModelSerializer):
    name = serializers.SerializerMethodField()
    company_name = serializers.CharField(source="company.name", read_only=True)
    roles = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id", "name", "email", "username", "first_name", "last_name", "phone",
            "status", "company", "company_name", "roles", "last_login", "date_joined",
        ]
        read_only_fields = ["id", "company", "company_name", "last_login", "date_joined"]

    def get_name(self, obj):
        return obj.get_full_name() or obj.email

    def get_roles(self, obj):
        return [
            {"id": user_role.role_id, "name": user_role.role.name, "display_name": user_role.role.display_name}
            for user_role in obj.roles.select_related("role")
        ]
