from django.contrib import admin
from .models import Shift, Attendance, AttendanceRegularization


@admin.register(Shift)
class ShiftAdmin(admin.ModelAdmin):
    list_display = ["name", "company", "start_time", "end_time", "is_night_shift", "grace_minutes"]
    list_filter = ["company", "is_night_shift"]
    search_fields = ["name"]


@admin.register(Attendance)
class AttendanceAdmin(admin.ModelAdmin):
    list_display = ["employee", "company", "date", "status", "check_in", "check_out", "working_hours", "is_late"]
    list_filter = ["company", "status", "is_late", "date"]
    search_fields = ["employee__first_name", "employee__last_name", "employee__employee_id"]
    date_hierarchy = "date"
    ordering = ["-date"]


@admin.register(AttendanceRegularization)
class AttendanceRegularizationAdmin(admin.ModelAdmin):
    list_display = ["employee", "company", "attendance", "status", "approved_by", "approved_at"]
    list_filter = ["company", "status"]
    search_fields = ["employee__first_name", "employee__last_name"]
    ordering = ["-attendance__date"]
