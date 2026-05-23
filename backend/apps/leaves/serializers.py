from rest_framework import serializers
from .models import LeaveType, LeaveBalance, LeaveRequest


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


class LeaveRequestSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source="employee.full_name", read_only=True)
    leave_type_name = serializers.CharField(source="leave_type.name", read_only=True)
    reviewed_by_name = serializers.CharField(source="reviewed_by.get_full_name", read_only=True)

    class Meta:
        model = LeaveRequest
        exclude = ["company"]
        read_only_fields = ["id", "status", "reviewed_by", "reviewed_at", "created_at", "updated_at"]


class LeaveApprovalSerializer(serializers.Serializer):
    action = serializers.ChoiceField(choices=["approve", "reject"])
    comment = serializers.CharField(required=False, allow_blank=True)
