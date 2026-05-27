from rest_framework import serializers
from .models import (
    Holiday,
    LeaveApproval,
    LeaveBalance,
    LeaveCreditLog,
    LeavePolicy,
    LeaveRequest,
    LeaveTransaction,
    LeaveType,
    ReportingManager,
)
from .services import leave_days


class LeaveTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = LeaveType
        exclude = ["company"]


class LeaveBalanceSerializer(serializers.ModelSerializer):
    leave_type_name = serializers.CharField(source="leave_type.name", read_only=True)
    available_days = serializers.ReadOnlyField()

    class Meta:
        model = LeaveBalance
        exclude = ["company"]


class LeavePolicySerializer(serializers.ModelSerializer):
    leave_type_name = serializers.CharField(source="leave_type.name", read_only=True)
    leave_type_code = serializers.CharField(source="leave_type.code", read_only=True)

    class Meta:
        model = LeavePolicy
        exclude = ["company"]

    def validate(self, attrs):
        frequency = attrs.get("accrual_frequency", getattr(self.instance, "accrual_frequency", None))
        amount = attrs.get("credit_amount", getattr(self.instance, "credit_amount", 0))
        if frequency in [LeavePolicy.AccrualFrequency.MONTHLY, LeavePolicy.AccrualFrequency.YEARLY] and amount <= 0:
            raise serializers.ValidationError({"credit_amount": "Credit amount must be greater than zero."})
        day = attrs.get("monthly_credit_day", getattr(self.instance, "monthly_credit_day", 1))
        month = attrs.get("yearly_credit_month", getattr(self.instance, "yearly_credit_month", 1))
        yearly_day = attrs.get("yearly_credit_day", getattr(self.instance, "yearly_credit_day", 1))
        if not 1 <= day <= 31:
            raise serializers.ValidationError({"monthly_credit_day": "Day must be between 1 and 31."})
        if not 1 <= month <= 12:
            raise serializers.ValidationError({"yearly_credit_month": "Month must be between 1 and 12."})
        if not 1 <= yearly_day <= 31:
            raise serializers.ValidationError({"yearly_credit_day": "Day must be between 1 and 31."})
        return attrs

    def save(self, **kwargs):
        policy = super().save(**kwargs)
        leave_type = policy.leave_type
        leave_type.is_carry_forwardable = policy.is_carry_forward_enabled
        leave_type.max_carry_forward_days = policy.max_carry_forward_days
        leave_type.allow_negative_balance = policy.allow_negative_balance
        leave_type.max_negative_days = policy.max_negative_days
        leave_type.days_per_year = max(leave_type.days_per_year, policy.credit_amount)
        leave_type.save(update_fields=[
            "is_carry_forwardable",
            "max_carry_forward_days",
            "allow_negative_balance",
            "max_negative_days",
            "days_per_year",
            "updated_at",
        ])
        return policy


class LeaveTransactionSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source="employee.full_name", read_only=True)
    leave_type_name = serializers.CharField(source="leave_type.name", read_only=True)
    leave_type_code = serializers.CharField(source="leave_type.code", read_only=True)

    class Meta:
        model = LeaveTransaction
        exclude = ["company"]
        read_only_fields = ["id", "created_at", "updated_at"]


class LeaveCreditLogSerializer(serializers.ModelSerializer):
    policy_name = serializers.CharField(source="policy.leave_type.name", read_only=True)
    leave_type_name = serializers.CharField(source="leave_type.name", read_only=True)
    leave_type_code = serializers.CharField(source="leave_type.code", read_only=True)

    class Meta:
        model = LeaveCreditLog
        exclude = ["company"]
        read_only_fields = ["id", "created_at", "updated_at"]


class LeaveApprovalSerializer(serializers.ModelSerializer):
    approver_name = serializers.SerializerMethodField()

    class Meta:
        model = LeaveApproval
        exclude = ["company", "leave_request"]
        read_only_fields = ["id", "status", "acted_at", "created_at", "updated_at"]

    def get_approver_name(self, obj):
        if obj.approver_employee:
            return obj.approver_employee.full_name
        if obj.approver:
            return obj.approver.get_full_name() or obj.approver.email
        return "Unassigned"


class LeaveRequestSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source="employee.full_name", read_only=True)
    employee_department = serializers.CharField(source="employee.department.name", read_only=True)
    leave_type_name = serializers.CharField(source="leave_type.name", read_only=True)
    reviewed_by_name = serializers.CharField(source="reviewed_by.get_full_name", read_only=True)
    applied_on = serializers.DateTimeField(source="created_at", read_only=True)
    company_name = serializers.CharField(source="company.name", read_only=True)
    approvals = LeaveApprovalSerializer(many=True, read_only=True)
    current_approver_name = serializers.SerializerMethodField()

    class Meta:
        model = LeaveRequest
        exclude = ["company"]
        read_only_fields = [
            "id", "employee", "total_days", "status", "reviewed_by", "reviewed_at",
            "review_comment", "current_approval_level", "final_decision_at", "created_at", "updated_at",
        ]

    def get_current_approver_name(self, obj):
        approval = next(
            (item for item in obj.approvals.all() if item.level == obj.current_approval_level and item.status == "pending"),
            None,
        )
        if not approval:
            return None
        return LeaveApprovalSerializer().get_approver_name(approval)

    def validate(self, attrs):
        from_date = attrs.get("from_date", getattr(self.instance, "from_date", None))
        to_date = attrs.get("to_date", getattr(self.instance, "to_date", None))
        day_type = attrs.get("day_type", getattr(self.instance, "day_type", "full_day"))
        leave_type = attrs.get("leave_type", getattr(self.instance, "leave_type", None))

        if from_date and to_date and to_date < from_date:
            raise serializers.ValidationError({"to_date": "To date cannot be before from date."})
        if leave_type and leave_type.requires_document and not attrs.get("document") and not getattr(self.instance, "document", None):
            raise serializers.ValidationError({"document": "Document is required for this leave type."})
        if from_date and to_date:
            attrs["total_days"] = leave_days(from_date, to_date, day_type)
        return attrs


class LeaveActionSerializer(serializers.Serializer):
    action = serializers.ChoiceField(choices=["approve", "reject", "escalate"])
    comment = serializers.CharField(required=False, allow_blank=True)


class ReportingManagerSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source="employee.full_name", read_only=True)
    manager_name = serializers.CharField(source="manager.full_name", read_only=True)

    class Meta:
        model = ReportingManager
        exclude = ["company"]


class HolidaySerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source="department.name", read_only=True)

    class Meta:
        model = Holiday
        exclude = ["company"]
