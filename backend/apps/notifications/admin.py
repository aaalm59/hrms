from django.contrib import admin
from .models import Notification, Announcement


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ["recipient", "company", "title", "notification_type", "is_read", "read_at", "created_at"]
    list_filter = ["company", "notification_type", "is_read"]
    search_fields = ["recipient__email", "title"]
    date_hierarchy = "created_at"
    ordering = ["-created_at"]


@admin.register(Announcement)
class AnnouncementAdmin(admin.ModelAdmin):
    list_display = ["title", "company", "is_pinned", "created_by", "expires_at", "created_at"]
    list_filter = ["company", "is_pinned"]
    search_fields = ["title", "created_by__email"]
    date_hierarchy = "created_at"
    ordering = ["-created_at"]
    filter_horizontal = ["target_departments"]
