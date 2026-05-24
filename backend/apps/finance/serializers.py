from rest_framework import serializers
from .models import Budget, Expense, ExpenseCategory


class ExpenseCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = ExpenseCategory
        fields = ["id", "name", "code", "description"]


class BudgetSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source="department.name", read_only=True)
    spent = serializers.ReadOnlyField()
    remaining = serializers.ReadOnlyField()
    utilization_pct = serializers.SerializerMethodField()

    class Meta:
        model = Budget
        fields = [
            "id", "name", "budget_type", "department", "department_name",
            "amount", "fiscal_year", "month", "quarter", "status",
            "description", "spent", "remaining", "utilization_pct",
        ]

    def get_utilization_pct(self, obj):
        if not obj.amount:
            return 0
        return round((float(obj.spent) / float(obj.amount)) * 100, 1)


class ExpenseSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source="category.name", read_only=True)
    department_name = serializers.CharField(source="department.name", read_only=True)
    budget_name = serializers.CharField(source="budget.name", read_only=True)
    submitted_by_name = serializers.SerializerMethodField()
    approved_by_name = serializers.SerializerMethodField()

    class Meta:
        model = Expense
        fields = [
            "id", "title", "category", "category_name", "budget", "budget_name",
            "department", "department_name", "amount", "currency", "expense_date",
            "status", "submitted_by", "submitted_by_name", "approved_by",
            "approved_by_name", "description", "payment_method", "receipt",
            "created_at",
        ]
        read_only_fields = ["submitted_by", "approved_by"]

    def get_submitted_by_name(self, obj):
        if obj.submitted_by:
            return obj.submitted_by.get_full_name() or obj.submitted_by.email
        return None

    def get_approved_by_name(self, obj):
        if obj.approved_by:
            return obj.approved_by.get_full_name() or obj.approved_by.email
        return None
