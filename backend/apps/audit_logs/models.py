from django.db import models
from django.conf import settings


class ActivityLog(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="activity_logs"
    )
    company = models.ForeignKey(
        "companies.Company", on_delete=models.SET_NULL, null=True, related_name="activity_logs"
    )
    action = models.CharField(max_length=50)
    model_name = models.CharField(max_length=100)
    object_id = models.CharField(max_length=50, blank=True)
    description = models.TextField(blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.CharField(max_length=500, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = "activity_logs"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.user} – {self.action} – {self.model_name}"


class LoginLog(models.Model):
    class Status(models.TextChoices):
        SUCCESS = "success", "Success"
        FAILED = "failed", "Failed"
        LOCKED = "locked", "Account Locked"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="login_logs"
    )
    email = models.EmailField()
    status = models.CharField(max_length=20, choices=Status.choices)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    device = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "login_logs"
        ordering = ["-created_at"]
