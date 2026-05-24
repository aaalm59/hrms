from django.contrib import admin
from .models import SalaryStructure, SalaryComponent, EmployeeSalary, Payroll, Payslip


class SalaryComponentInline(admin.TabularInline):
    model = SalaryComponent
    extra = 0
    fields = ["name", "component_type", "calculation_method", "value", "is_taxable", "is_pf_applicable", "order"]


class PayslipInline(admin.TabularInline):
    model = Payslip
    extra = 0
    fields = ["employee", "gross_salary", "total_deductions", "net_salary", "paid_days", "lop_days"]
    readonly_fields = ["employee", "gross_salary", "total_deductions", "net_salary", "paid_days", "lop_days"]
    can_delete = False


@admin.register(SalaryStructure)
class SalaryStructureAdmin(admin.ModelAdmin):
    list_display = ["name", "company", "is_active"]
    list_filter = ["company", "is_active"]
    search_fields = ["name"]
    inlines = [SalaryComponentInline]


@admin.register(SalaryComponent)
class SalaryComponentAdmin(admin.ModelAdmin):
    list_display = ["name", "company", "salary_structure", "component_type", "calculation_method", "value", "is_taxable", "order"]
    list_filter = ["company", "component_type", "calculation_method", "is_taxable"]
    search_fields = ["name", "salary_structure__name"]
    ordering = ["salary_structure", "order"]


@admin.register(EmployeeSalary)
class EmployeeSalaryAdmin(admin.ModelAdmin):
    list_display = ["employee", "company", "salary_structure", "ctc", "basic", "effective_from", "effective_to", "is_current"]
    list_filter = ["company", "salary_structure", "is_current"]
    search_fields = ["employee__first_name", "employee__last_name", "employee__employee_id"]
    date_hierarchy = "effective_from"
    ordering = ["-effective_from"]


@admin.register(Payroll)
class PayrollAdmin(admin.ModelAdmin):
    list_display = ["company", "month", "year", "status", "total_employees", "total_gross", "total_deductions", "total_net", "processed_by", "processed_at"]
    list_filter = ["company", "status", "year", "month"]
    ordering = ["-year", "-month"]
    inlines = [PayslipInline]


@admin.register(Payslip)
class PayslipAdmin(admin.ModelAdmin):
    list_display = ["employee", "company", "payroll", "gross_salary", "total_deductions", "net_salary", "paid_days", "lop_days"]
    list_filter = ["company", "payroll__year", "payroll__month"]
    search_fields = ["employee__first_name", "employee__last_name", "employee__employee_id"]
    ordering = ["-payroll__year", "-payroll__month"]
