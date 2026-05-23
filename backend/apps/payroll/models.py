from django.db import models
from apps.core.models import TenantModel


class SalaryStructure(TenantModel):
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "salary_structures"

    def __str__(self):
        return self.name


class SalaryComponent(TenantModel):
    class ComponentType(models.TextChoices):
        EARNING = "earning", "Earning"
        DEDUCTION = "deduction", "Deduction"

    class CalculationMethod(models.TextChoices):
        FIXED = "fixed", "Fixed Amount"
        PERCENTAGE = "percentage", "Percentage of Basic"

    salary_structure = models.ForeignKey(SalaryStructure, on_delete=models.CASCADE, related_name="components")
    name = models.CharField(max_length=100)
    component_type = models.CharField(max_length=15, choices=ComponentType.choices)
    calculation_method = models.CharField(max_length=15, choices=CalculationMethod.choices, default=CalculationMethod.FIXED)
    value = models.DecimalField(max_digits=10, decimal_places=2)
    is_taxable = models.BooleanField(default=True)
    is_pf_applicable = models.BooleanField(default=False)
    order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        db_table = "salary_components"
        ordering = ["order"]


class EmployeeSalary(TenantModel):
    employee = models.ForeignKey("employees.Employee", on_delete=models.CASCADE, related_name="salaries")
    salary_structure = models.ForeignKey(SalaryStructure, on_delete=models.PROTECT)
    ctc = models.DecimalField(max_digits=12, decimal_places=2)
    basic = models.DecimalField(max_digits=12, decimal_places=2)
    effective_from = models.DateField()
    effective_to = models.DateField(null=True, blank=True)
    is_current = models.BooleanField(default=True)

    class Meta:
        db_table = "employee_salaries"


class Payroll(TenantModel):
    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        PROCESSING = "processing", "Processing"
        PROCESSED = "processed", "Processed"
        APPROVED = "approved", "Approved"
        PAID = "paid", "Paid"

    month = models.PositiveSmallIntegerField()
    year = models.PositiveSmallIntegerField()
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT)
    total_employees = models.PositiveIntegerField(default=0)
    total_gross = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    total_deductions = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    total_net = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    processed_by = models.ForeignKey(
        "authentication.User", on_delete=models.SET_NULL, null=True, related_name="processed_payrolls"
    )
    processed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "payrolls"
        unique_together = [["company", "month", "year"]]

    def __str__(self):
        return f"Payroll {self.month}/{self.year} – {self.company.name}"


class Payslip(TenantModel):
    payroll = models.ForeignKey(Payroll, on_delete=models.CASCADE, related_name="payslips")
    employee = models.ForeignKey("employees.Employee", on_delete=models.CASCADE, related_name="payslips")
    gross_salary = models.DecimalField(max_digits=12, decimal_places=2)
    total_deductions = models.DecimalField(max_digits=12, decimal_places=2)
    net_salary = models.DecimalField(max_digits=12, decimal_places=2)
    working_days = models.PositiveSmallIntegerField()
    paid_days = models.PositiveSmallIntegerField()
    lop_days = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    earnings = models.JSONField(default=dict)
    deductions = models.JSONField(default=dict)
    is_published = models.BooleanField(default=False)
    pdf_file = models.FileField(upload_to="payslips/", null=True, blank=True)

    class Meta:
        db_table = "payslips"
        unique_together = [["company", "payroll", "employee"]]
