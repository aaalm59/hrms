from django.db import models


class Company(models.Model):
    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        INACTIVE = "inactive", "Inactive"
        SUSPENDED = "suspended", "Suspended"
        TRIAL = "trial", "Trial"

    name = models.CharField(max_length=255)
    slug = models.SlugField(unique=True)
    email = models.EmailField(unique=True)
    phone = models.CharField(max_length=20, blank=True)
    website = models.URLField(blank=True)
    logo = models.ImageField(upload_to="company/logos/", null=True, blank=True)
    address = models.TextField(blank=True)
    city = models.CharField(max_length=100, blank=True)
    state = models.CharField(max_length=100, blank=True)
    country = models.CharField(max_length=100, default="India")
    pincode = models.CharField(max_length=10, blank=True)
    timezone = models.CharField(max_length=50, default="Asia/Kolkata")
    currency = models.CharField(max_length=10, default="INR")
    industry = models.CharField(max_length=100, blank=True)
    gst_number = models.CharField(max_length=20, blank=True)
    pan_number = models.CharField(max_length=20, blank=True)
    description = models.TextField(blank=True)
    module_flags = models.JSONField(default=dict, help_text="Enable/disable HRMS modules per company")
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.TRIAL)
    is_active = models.BooleanField(default=True)
    max_employees = models.PositiveIntegerField(default=50)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "companies"
        verbose_name_plural = "Companies"
        ordering = ["-created_at"]

    def __str__(self):
        return self.name

    @property
    def employee_count(self):
        return self.employees_employee_set.filter(is_active=True).count()


class CompanySettings(models.Model):
    company = models.OneToOneField(Company, on_delete=models.CASCADE, related_name="settings")
    working_days = models.JSONField(
        default=list,
        help_text='e.g. ["Monday","Tuesday","Wednesday","Thursday","Friday"]',
    )
    work_start_time = models.TimeField(default="09:00")
    work_end_time = models.TimeField(default="18:00")
    weekly_off_days = models.JSONField(default=list, help_text='e.g. ["Saturday","Sunday"]')
    late_mark_after_minutes = models.PositiveIntegerField(default=15)
    half_day_hours = models.DecimalField(max_digits=4, decimal_places=2, default=4.0)
    payroll_processing_day = models.PositiveSmallIntegerField(default=1)
    fiscal_year_start_month = models.PositiveSmallIntegerField(default=4)
    probation_period_days = models.PositiveIntegerField(default=90)
    notice_period_days = models.PositiveIntegerField(default=30)

    class Meta:
        db_table = "company_settings"

    def __str__(self):
        return f"Settings – {self.company.name}"


class CompanyHoliday(models.Model):
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name="holidays")
    name = models.CharField(max_length=255)
    date = models.DateField()
    is_optional = models.BooleanField(default=False)

    class Meta:
        db_table = "company_holidays"
        unique_together = [["company", "date"]]

    def __str__(self):
        return f"{self.name} ({self.date})"
