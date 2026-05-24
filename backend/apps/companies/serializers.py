from rest_framework import serializers
from .models import Company, CompanySettings, CompanyHoliday


class CompanySettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = CompanySettings
        exclude = ["company"]


class CompanySerializer(serializers.ModelSerializer):
    settings = CompanySettingsSerializer(read_only=True)
    employee_count = serializers.ReadOnlyField()
    subscription_plan = serializers.SerializerMethodField()

    class Meta:
        model = Company
        fields = "__all__"
        read_only_fields = ["id", "slug", "created_at", "updated_at"]

    def get_subscription_plan(self, obj):
        sub = getattr(obj, "subscription", None)
        if sub:
            return sub.plan.name
        return None


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
