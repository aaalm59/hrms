from rest_framework import serializers
from .models import Attendance, Shift, AttendanceRegularization


class ShiftSerializer(serializers.ModelSerializer):
    class Meta:
        model = Shift
        exclude = ["company"]


class AttendanceSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source="employee.full_name", read_only=True)
    shift_name = serializers.CharField(source="shift.name", read_only=True)

    class Meta:
        model = Attendance
        exclude = ["company"]
        read_only_fields = ["id", "working_hours", "overtime_hours", "is_late", "late_minutes", "created_at", "updated_at"]


class CheckInSerializer(serializers.Serializer):
    location = serializers.JSONField(required=False)
    remarks = serializers.CharField(required=False, allow_blank=True)


class AttendanceRegularizationSerializer(serializers.ModelSerializer):
    class Meta:
        model = AttendanceRegularization
        exclude = ["company"]
        read_only_fields = ["id", "status", "approved_by", "approved_at", "created_at"]
