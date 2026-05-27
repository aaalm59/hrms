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
    allow_negative_balance = models.BooleanField(default=False)
    max_negative_days = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    is_encashable = models.BooleanField(default=False)
    requires_hr_approval = models.BooleanField(default=True)
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
    encashed_days = models.DecimalField(max_digits=5, decimal_places=2, default=0)

    class Meta:
        db_table = "leave_balances"
        unique_together = [["company", "employee", "leave_type", "year"]]

    @property
    def available_days(self):
        return self.total_days - self.used_days - self.pending_days


class LeavePolicy(TenantModel):
    class AccrualFrequency(models.TextChoices):
        MONTHLY = "monthly", "Monthly"
        YEARLY = "yearly", "Yearly"
        MANUAL = "manual", "Manual"

    class MonthlyCreditTiming(models.TextChoices):
        MONTH_END = "month_end", "Month End"
        NEXT_MONTH_FIRST = "next_month_first", "1st Day of Next Month"
        DAY_OF_MONTH = "day_of_month", "Specific Day of Month"

    leave_type = models.OneToOneField(LeaveType, on_delete=models.CASCADE, related_name="policy")
    accrual_frequency = models.CharField(max_length=20, choices=AccrualFrequency.choices, default=AccrualFrequency.MANUAL)
    credit_amount = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    monthly_credit_timing = models.CharField(
        max_length=30, choices=MonthlyCreditTiming.choices, default=MonthlyCreditTiming.MONTH_END
    )
    monthly_credit_day = models.PositiveSmallIntegerField(default=1)
    yearly_credit_month = models.PositiveSmallIntegerField(default=1)
    yearly_credit_day = models.PositiveSmallIntegerField(default=5)
    is_carry_forward_enabled = models.BooleanField(default=False)
    max_carry_forward_days = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    max_balance_days = models.DecimalField(max_digits=6, decimal_places=2, default=0)
    allow_negative_balance = models.BooleanField(default=False)
    max_negative_days = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    auto_expire_days = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "leave_policies"
        unique_together = [["company", "leave_type"]]

    def __str__(self):
        return f"{self.leave_type.code} policy"


class LeaveTransaction(TenantModel):
    class TransactionType(models.TextChoices):
        CREDIT = "credit", "Credit"
        DEBIT = "debit", "Debit"
        ENCASH = "encash", "Encash"
        EXPIRY = "expiry", "Expiry"
        ADJUSTMENT = "adjustment", "Adjustment"
        CARRY_FORWARD = "carry_forward", "Carry Forward"

    employee = models.ForeignKey("employees.Employee", on_delete=models.CASCADE, related_name="leave_transactions")
    leave_type = models.ForeignKey(LeaveType, on_delete=models.PROTECT)
    leave_balance = models.ForeignKey(LeaveBalance, on_delete=models.SET_NULL, null=True, blank=True, related_name="transactions")
    policy = models.ForeignKey(LeavePolicy, on_delete=models.SET_NULL, null=True, blank=True, related_name="transactions")
    transaction_type = models.CharField(max_length=20, choices=TransactionType.choices)
    days = models.DecimalField(max_digits=6, decimal_places=2)
    balance_after = models.DecimalField(max_digits=6, decimal_places=2)
    effective_date = models.DateField()
    expires_on = models.DateField(null=True, blank=True)
    reference = models.CharField(max_length=120, blank=True)
    remarks = models.TextField(blank=True)

    class Meta:
        db_table = "leave_transactions"
        ordering = ["-effective_date", "-created_at"]


class LeaveCreditLog(TenantModel):
    class Status(models.TextChoices):
        SUCCESS = "success", "Success"
        PARTIAL = "partial", "Partial"
        SKIPPED = "skipped", "Skipped"
        FAILED = "failed", "Failed"

    policy = models.ForeignKey(LeavePolicy, on_delete=models.CASCADE, related_name="credit_logs")
    leave_type = models.ForeignKey(LeaveType, on_delete=models.PROTECT)
    period_key = models.CharField(max_length=20)
    credit_date = models.DateField()
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.SUCCESS)
    employees_processed = models.PositiveIntegerField(default=0)
    employees_credited = models.PositiveIntegerField(default=0)
    employees_skipped = models.PositiveIntegerField(default=0)
    total_days_credited = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    message = models.TextField(blank=True)

    class Meta:
        db_table = "leave_credit_logs"
        unique_together = [["company", "policy", "period_key"]]
        ordering = ["-credit_date", "-created_at"]


class LeaveRequest(TenantModel):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        MANAGER_APPROVED = "manager_approved", "Manager Approved"
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"
        CANCELLED = "cancelled", "Cancelled"
        ESCALATED = "escalated", "Escalated"

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
    current_approval_level = models.PositiveSmallIntegerField(default=1)
    final_decision_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "leave_requests"
        ordering = ["-created_at"]


class LeaveApproval(TenantModel):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"
        ESCALATED = "escalated", "Escalated"
        SKIPPED = "skipped", "Skipped"

    leave_request = models.ForeignKey(LeaveRequest, on_delete=models.CASCADE, related_name="approvals")
    approver = models.ForeignKey(
        "authentication.User", on_delete=models.SET_NULL, null=True, blank=True, related_name="leave_approval_tasks"
    )
    approver_employee = models.ForeignKey(
        "employees.Employee", on_delete=models.SET_NULL, null=True, blank=True, related_name="leave_approval_tasks"
    )
    role = models.CharField(max_length=30)
    level = models.PositiveSmallIntegerField()
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    comment = models.TextField(blank=True)
    acted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "leave_approvals"
        ordering = ["level", "id"]
        unique_together = [["company", "leave_request", "level"]]


class ReportingManager(TenantModel):
    employee = models.ForeignKey("employees.Employee", on_delete=models.CASCADE, related_name="reporting_links")
    manager = models.ForeignKey("employees.Employee", on_delete=models.CASCADE, related_name="managed_reporting_links")
    level = models.PositiveSmallIntegerField(default=1)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "reporting_managers"
        unique_together = [["company", "employee", "level"]]
        ordering = ["level"]


class Holiday(TenantModel):
    class HolidayType(models.TextChoices):
        PUBLIC = "public", "Public Holiday"
        RESTRICTED = "restricted", "Restricted Holiday"
        COMPANY = "company", "Company Holiday"

    name = models.CharField(max_length=150)
    date = models.DateField()
    holiday_type = models.CharField(max_length=20, choices=HolidayType.choices, default=HolidayType.PUBLIC)
    department = models.ForeignKey(
        "employees.Department", on_delete=models.SET_NULL, null=True, blank=True, related_name="holidays"
    )
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "holidays"
        unique_together = [["company", "date", "name"]]
        ordering = ["date"]
