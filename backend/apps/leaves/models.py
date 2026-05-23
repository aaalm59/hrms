from django.db import models
from apps.core.models import TenantModel


class LeaveType(TenantModel):
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=10)
    days_per_year = models.DecimalField(max_digits=5, decimal_places=2)
    is_paid = models.BooleanField(default=True)
    is_carry_forwardable = models.BooleanField(default=False)
    max_carry_forward_days = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    requires_document = models.BooleanField(default=False)
    min_notice_days = models.PositiveSmallIntegerField(default=0)
    gender_specific = models.CharField(max_length=10, blank=True, help_text="male/female/blank=all")
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "leave_types"
        unique_together = [["company", "code"]]

    def __str__(self):
        return self.name


class LeaveBalance(TenantModel):
    employee = models.ForeignKey("employees.Employee", on_delete=models.CASCADE, related_name="leave_balances")
    leave_type = models.ForeignKey(LeaveType, on_delete=models.CASCADE)
    year = models.PositiveSmallIntegerField()
    total_days = models.DecimalField(max_digits=5, decimal_places=2)
    used_days = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    pending_days = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    carried_forward = models.DecimalField(max_digits=5, decimal_places=2, default=0)

    class Meta:
        db_table = "leave_balances"
        unique_together = [["company", "employee", "leave_type", "year"]]

    @property
    def available_days(self):
        return self.total_days - self.used_days - self.pending_days


class LeaveRequest(TenantModel):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"
        CANCELLED = "cancelled", "Cancelled"

    class DayType(models.TextChoices):
        FULL_DAY = "full_day", "Full Day"
        HALF_DAY = "half_day", "Half Day"

    employee = models.ForeignKey("employees.Employee", on_delete=models.CASCADE, related_name="leave_requests")
    leave_type = models.ForeignKey(LeaveType, on_delete=models.PROTECT)
    from_date = models.DateField()
    to_date = models.DateField()
    total_days = models.DecimalField(max_digits=5, decimal_places=2)
    day_type = models.CharField(max_length=10, choices=DayType.choices, default=DayType.FULL_DAY)
    reason = models.TextField()
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    reviewed_by = models.ForeignKey(
        "authentication.User", on_delete=models.SET_NULL, null=True, blank=True, related_name="reviewed_leaves"
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    review_comment = models.TextField(blank=True)
    document = models.FileField(upload_to="leave_documents/", null=True, blank=True)

    class Meta:
        db_table = "leave_requests"
        ordering = ["-created_at"]
