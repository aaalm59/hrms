from rest_framework import serializers
from .models import Plan, Subscription, Invoice


class PlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = Plan
        fields = "__all__"


class SubscriptionSerializer(serializers.ModelSerializer):
    plan = PlanSerializer(read_only=True)
    plan_id = serializers.PrimaryKeyRelatedField(queryset=Plan.objects.all(), write_only=True, source="plan")
    is_active = serializers.ReadOnlyField()
    company_name = serializers.CharField(source="company.name", read_only=True)

    class Meta:
        model = Subscription
        fields = "__all__"
        read_only_fields = ["id", "created_at", "updated_at"]


class InvoiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Invoice
        fields = "__all__"
        read_only_fields = ["id", "created_at", "invoice_number"]
