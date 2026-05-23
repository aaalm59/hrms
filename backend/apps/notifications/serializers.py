from rest_framework import serializers
from .models import Notification, Announcement


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        exclude = ["company"]
        read_only_fields = ["id", "is_read", "read_at", "created_at"]


class AnnouncementSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source="created_by.get_full_name", read_only=True)

    class Meta:
        model = Announcement
        exclude = ["company"]
        read_only_fields = ["id", "created_by", "created_at"]
