from django.db import models
from apps.core.models import TenantModel


class Notification(TenantModel):
    class Type(models.TextChoices):
        INFO = "info", "Info"
        SUCCESS = "success", "Success"
        WARNING = "warning", "Warning"
        ERROR = "error", "Error"

    recipient = models.ForeignKey("authentication.User", on_delete=models.CASCADE, related_name="notifications")
    title = models.CharField(max_length=255)
    message = models.TextField()
    notification_type = models.CharField(max_length=20, choices=Type.choices, default=Type.INFO)
    is_read = models.BooleanField(default=False)
    read_at = models.DateTimeField(null=True, blank=True)
    action_url = models.CharField(max_length=500, blank=True)
    data = models.JSONField(null=True, blank=True)

    class Meta:
        db_table = "notifications"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.recipient.email} – {self.title}"


class Announcement(TenantModel):
    title = models.CharField(max_length=255)
    content = models.TextField()
    is_pinned = models.BooleanField(default=False)
    target_departments = models.ManyToManyField("employees.Department", blank=True)
    created_by = models.ForeignKey("authentication.User", on_delete=models.SET_NULL, null=True)
    expires_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "announcements"
        ordering = ["-is_pinned", "-created_at"]
