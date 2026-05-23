from django.db import models
from apps.core.models import TenantModel


class Shift(TenantModel):
    name = models.CharField(max_length=100)
    start_time = models.TimeField()
    end_time = models.TimeField()
    is_night_shift = models.BooleanField(default=False)
    grace_minutes = models.PositiveSmallIntegerField(default=15)
    break_minutes = models.PositiveSmallIntegerField(default=60)

    class Meta:
        db_table = "shifts"

    def __str__(self):
        return f"{self.name} ({self.start_time}-{self.end_time})"


class Attendance(TenantModel):
    class Status(models.TextChoices):
        PRESENT = "present", "Present"
        ABSENT = "absent", "Absent"
        LEAVE = "leave", "Leave"
        HALF_DAY = "half_day", "Half Day"
        HOLIDAY = "holiday", "Holiday"
        WEEKEND = "weekend", "Weekend"
        WORK_FROM_HOME = "wfh", "Work From Home"
        REGULARIZED = "regularized", "Regularized"

    employee = models.ForeignKey("employees.Employee", on_delete=models.CASCADE, related_name="attendances")
    date = models.DateField(db_index=True)
    shift = models.ForeignKey(Shift, on_delete=models.SET_NULL, null=True, blank=True)
    check_in = models.DateTimeField(null=True, blank=True)
    check_out = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ABSENT)
    working_hours = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    overtime_hours = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    is_late = models.BooleanField(default=False)
    late_minutes = models.PositiveIntegerField(default=0)
    remarks = models.TextField(blank=True)
    check_in_location = models.JSONField(null=True, blank=True)

    class Meta:
        db_table = "attendance"
        unique_together = [["company", "employee", "date"]]
        ordering = ["-date"]

    def __str__(self):
        return f"{self.employee} – {self.date} – {self.status}"


class AttendanceRegularization(TenantModel):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"

    attendance = models.OneToOneField(Attendance, on_delete=models.CASCADE, related_name="regularization")
    employee = models.ForeignKey("employees.Employee", on_delete=models.CASCADE)
    reason = models.TextField()
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    approved_by = models.ForeignKey(
        "authentication.User", on_delete=models.SET_NULL, null=True, blank=True
    )
    approved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "attendance_regularizations"
