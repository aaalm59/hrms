from django.contrib import admin
from .models import (
    Holiday,
    LeaveApproval,
    LeaveBalance,
    LeaveCreditLog,
    LeavePolicy,
    LeaveRequest,
    LeaveTransaction,
    LeaveType,
    ReportingManager,
)


@admin.register(LeaveType)
class LeaveTypeAdmin(admin.ModelAdmin):
    list_display = ["name", "code", "company", "days_per_year", "is_paid", "is_carry_forwardable", "is_active"]
    list_filter = ["company", "is_paid", "is_carry_forwardable", "is_active"]
    search_fields = ["name", "code"]


@admin.register(LeaveBalance)
class LeaveBalanceAdmin(admin.ModelAdmin):
    list_display = ["employee", "company", "leave_type", "year", "total_days", "used_days", "pending_days", "carried_forward", "encashed_days"]
    list_filter = ["company", "leave_type", "year"]
    search_fields = ["employee__first_name", "employee__last_name", "employee__employee_id"]


@admin.register(LeaveRequest)
class LeaveRequestAdmin(admin.ModelAdmin):
    list_display = ["employee", "company", "leave_type", "from_date", "to_date", "total_days", "day_type", "status", "reviewed_by"]
    list_filter = ["company", "status", "leave_type", "day_type"]
    search_fields = ["employee__first_name", "employee__last_name", "employee__employee_id"]
    date_hierarchy = "from_date"
    ordering = ["-from_date"]


@admin.register(LeavePolicy)
class LeavePolicyAdmin(admin.ModelAdmin):
    list_display = ["leave_type", "company", "accrual_frequency", "credit_amount", "is_active"]
    list_filter = ["company", "accrual_frequency", "is_active"]


@admin.register(LeaveTransaction)
class LeaveTransactionAdmin(admin.ModelAdmin):
    list_display = ["employee", "company", "leave_type", "transaction_type", "days", "balance_after", "effective_date"]
    list_filter = ["company", "transaction_type", "leave_type"]
    search_fields = ["employee__first_name", "employee__last_name", "employee__employee_id", "reference"]


@admin.register(LeaveCreditLog)
class LeaveCreditLogAdmin(admin.ModelAdmin):
    list_display = ["policy", "company", "period_key", "credit_date", "status", "employees_credited", "total_days_credited"]
    list_filter = ["company", "status", "credit_date"]


@admin.register(LeaveApproval)
class LeaveApprovalAdmin(admin.ModelAdmin):
    list_display = ["leave_request", "company", "level", "role", "approver", "status", "acted_at"]
    list_filter = ["company", "status", "role"]


@admin.register(ReportingManager)
class ReportingManagerAdmin(admin.ModelAdmin):
    list_display = ["employee", "manager", "company", "level", "is_active"]
    list_filter = ["company", "is_active"]


@admin.register(Holiday)
class HolidayAdmin(admin.ModelAdmin):
    list_display = ["name", "company", "date", "holiday_type", "department", "is_active"]
    list_filter = ["company", "holiday_type", "is_active"]
