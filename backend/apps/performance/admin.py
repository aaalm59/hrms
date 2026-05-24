from django.contrib import admin
from .models import AppraisalCycle, Goal, PerformanceReview


class GoalInline(admin.TabularInline):
    model = Goal
    extra = 0
    fields = ["employee", "title", "target", "achievement", "weightage", "due_date", "status"]


@admin.register(AppraisalCycle)
class AppraisalCycleAdmin(admin.ModelAdmin):
    list_display = ["name", "company", "start_date", "end_date", "is_active"]
    list_filter = ["company", "is_active"]
    search_fields = ["name"]
    date_hierarchy = "start_date"
    inlines = [GoalInline]


@admin.register(Goal)
class GoalAdmin(admin.ModelAdmin):
    list_display = ["employee", "company", "appraisal_cycle", "title", "weightage", "due_date", "status"]
    list_filter = ["company", "appraisal_cycle", "status"]
    search_fields = ["employee__first_name", "employee__last_name", "title"]
    date_hierarchy = "due_date"
    ordering = ["-due_date"]


@admin.register(PerformanceReview)
class PerformanceReviewAdmin(admin.ModelAdmin):
    list_display = ["employee", "company", "appraisal_cycle", "reviewer", "self_rating", "manager_rating", "final_rating", "is_submitted", "submitted_at"]
    list_filter = ["company", "appraisal_cycle", "is_submitted"]
    search_fields = ["employee__first_name", "employee__last_name"]
    ordering = ["-submitted_at"]
