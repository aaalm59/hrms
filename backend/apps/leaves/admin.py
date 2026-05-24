from django.contrib import admin
from .models import LeaveType, LeaveBalance, LeaveRequest


@admin.register(LeaveType)
class LeaveTypeAdmin(admin.ModelAdmin):
    list_display = ["name", "code", "company", "days_per_year", "is_paid", "is_carry_forwardable", "is_active"]
    list_filter = ["company", "is_paid", "is_carry_forwardable", "is_active"]
    search_fields = ["name", "code"]


@admin.register(LeaveBalance)
class LeaveBalanceAdmin(admin.ModelAdmin):
    list_display = ["employee", "company", "leave_type", "year", "total_days", "used_days", "pending_days", "carried_forward"]
    list_filter = ["company", "leave_type", "year"]
    search_fields = ["employee__first_name", "employee__last_name", "employee__employee_id"]


@admin.register(LeaveRequest)
class LeaveRequestAdmin(admin.ModelAdmin):
    list_display = ["employee", "company", "leave_type", "from_date", "to_date", "total_days", "day_type", "status", "reviewed_by"]
    list_filter = ["company", "status", "leave_type", "day_type"]
    search_fields = ["employee__first_name", "employee__last_name", "employee__employee_id"]
    date_hierarchy = "from_date"
    ordering = ["-from_date"]
