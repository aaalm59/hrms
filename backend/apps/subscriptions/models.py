from django.db import models
from apps.companies.models import Company


class Plan(models.Model):
    class Tier(models.TextChoices):
        BASIC = "basic", "Basic"
        STANDARD = "standard", "Standard"
        ENTERPRISE = "enterprise", "Enterprise"

    name = models.CharField(max_length=100)
    tier = models.CharField(max_length=20, choices=Tier.choices, unique=True)
    price_monthly = models.DecimalField(max_digits=10, decimal_places=2)
    price_yearly = models.DecimalField(max_digits=10, decimal_places=2)
    max_employees = models.PositiveIntegerField()
    max_storage_gb = models.PositiveIntegerField(default=5)
    features = models.JSONField(default=list)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "subscription_plans"

    def __str__(self):
        return f"{self.name} (₹{self.price_monthly}/month)"


class Subscription(models.Model):
    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        EXPIRED = "expired", "Expired"
        CANCELLED = "cancelled", "Cancelled"
        TRIAL = "trial", "Trial"

    class BillingCycle(models.TextChoices):
        MONTHLY = "monthly", "Monthly"
        YEARLY = "yearly", "Yearly"

    company = models.OneToOneField(Company, on_delete=models.CASCADE, related_name="subscription")
    plan = models.ForeignKey(Plan, on_delete=models.PROTECT, related_name="subscriptions")
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.TRIAL)
    billing_cycle = models.CharField(max_length=10, choices=BillingCycle.choices, default=BillingCycle.MONTHLY)
    start_date = models.DateField()
    end_date = models.DateField()
    trial_end_date = models.DateField(null=True, blank=True)
    amount_paid = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "subscriptions"

    def __str__(self):
        return f"{self.company.name} – {self.plan.name}"

    @property
    def is_active(self):
        from django.utils import timezone
        return self.status == self.Status.ACTIVE and self.end_date >= timezone.now().date()


class Invoice(models.Model):
    class Status(models.TextChoices):
        PAID = "paid", "Paid"
        PENDING = "pending", "Pending"
        FAILED = "failed", "Failed"

    subscription = models.ForeignKey(Subscription, on_delete=models.CASCADE, related_name="invoices")
    invoice_number = models.CharField(max_length=50, unique=True)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    due_date = models.DateField()
    paid_at = models.DateTimeField(null=True, blank=True)
    payment_reference = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "subscription_invoices"

    def __str__(self):
        return f"{self.invoice_number} – {self.status}"
