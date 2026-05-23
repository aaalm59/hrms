from rest_framework import serializers
from .models import AppraisalCycle, Goal, PerformanceReview


class AppraisalCycleSerializer(serializers.ModelSerializer):
    class Meta:
        model = AppraisalCycle
        exclude = ["company"]


class GoalSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source="employee.full_name", read_only=True)

    class Meta:
        model = Goal
        exclude = ["company"]
        read_only_fields = ["id", "created_at", "updated_at"]


class PerformanceReviewSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source="employee.full_name", read_only=True)
    reviewer_name = serializers.CharField(source="reviewer.get_full_name", read_only=True)

    class Meta:
        model = PerformanceReview
        exclude = ["company"]
        read_only_fields = ["id", "final_rating", "submitted_at", "created_at", "updated_at"]
