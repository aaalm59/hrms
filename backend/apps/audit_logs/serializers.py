from rest_framework import serializers
from .models import ActivityLog, LoginLog


class ActivityLogSerializer(serializers.ModelSerializer):
    user_email = serializers.CharField(source="user.email", read_only=True)

    class Meta:
        model = ActivityLog
        fields = "__all__"


class LoginLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = LoginLog
        fields = "__all__"
