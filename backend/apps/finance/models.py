from django.db import models
from apps.core.models import TenantModel


class Budget(TenantModel):
    class BudgetType(models.TextChoices):
        ANNUAL = "annual", "Annual"
        QUARTERLY = "quarterly", "Quarterly"
        MONTHLY = "monthly", "Monthly"

    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        ACTIVE = "active", "Active"
        CLOSED = "closed", "Closed"

    name = models.CharField(max_length=255)
    budget_type = models.CharField(max_length=20, choices=BudgetType.choices, default=BudgetType.ANNUAL)
    department = models.ForeignKey(
        "employees.Department", on_delete=models.SET_NULL, null=True, blank=True, related_name="budgets"
    )
    amount = models.DecimalField(max_digits=15, decimal_places=2)
    fiscal_year = models.PositiveSmallIntegerField()
    month = models.PositiveSmallIntegerField(null=True, blank=True)
    quarter = models.PositiveSmallIntegerField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)
    description = models.TextField(blank=True)

    class Meta:
        db_table = "finance_budgets"
        ordering = ["-fiscal_year", "name"]

    def __str__(self):
        return f"{self.name} ({self.fiscal_year})"

    @property
    def spent(self):
        return self.expenses.aggregate(total=models.Sum("amount"))["total"] or 0

    @property
    def remaining(self):
        return float(self.amount) - float(self.spent)


class ExpenseCategory(TenantModel):
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=20, blank=True)
    description = models.TextField(blank=True)

    class Meta:
        db_table = "finance_expense_categories"
        unique_together = [["company", "name"]]

    def __str__(self):
        return self.name


class Expense(TenantModel):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"
        PAID = "paid", "Paid"

    title = models.CharField(max_length=255)
    category = models.ForeignKey(
        ExpenseCategory, on_delete=models.SET_NULL, null=True, blank=True, related_name="expenses"
    )
    budget = models.ForeignKey(
        Budget, on_delete=models.SET_NULL, null=True, blank=True, related_name="expenses"
    )
    department = models.ForeignKey(
        "employees.Department", on_delete=models.SET_NULL, null=True, blank=True
    )
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(max_length=10, default="INR")
    expense_date = models.DateField()
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    submitted_by = models.ForeignKey(
        "authentication.User", on_delete=models.SET_NULL, null=True, related_name="submitted_expenses"
    )
    approved_by = models.ForeignKey(
        "authentication.User", on_delete=models.SET_NULL, null=True, blank=True, related_name="approved_expenses"
    )
    description = models.TextField(blank=True)
    receipt = models.FileField(upload_to="finance/receipts/", null=True, blank=True)
    payment_method = models.CharField(
        max_length=30,
        choices=[("cash", "Cash"), ("card", "Card"), ("bank_transfer", "Bank Transfer"), ("cheque", "Cheque")],
        default="bank_transfer",
    )

    class Meta:
        db_table = "finance_expenses"
        ordering = ["-expense_date"]

    def __str__(self):
        return f"{self.title} — {self.amount}"
