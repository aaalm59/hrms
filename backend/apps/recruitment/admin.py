from django.contrib import admin
from .models import JobPost, Candidate, Interview


class CandidateInline(admin.TabularInline):
    model = Candidate
    extra = 0
    fields = ["first_name", "last_name", "email", "stage", "experience_years"]
    readonly_fields = ["first_name", "last_name", "email", "experience_years"]
    show_change_link = True


class InterviewInline(admin.TabularInline):
    model = Interview
    extra = 0
    fields = ["interview_type", "scheduled_at", "duration_minutes", "status"]


@admin.register(JobPost)
class JobPostAdmin(admin.ModelAdmin):
    list_display = ["title", "company", "department", "designation", "employment_type", "vacancies", "status", "posted_by", "closing_date"]
    list_filter = ["company", "status", "employment_type", "department"]
    search_fields = ["title", "location"]
    date_hierarchy = "closing_date"
    ordering = ["-created_at"]
    inlines = [CandidateInline]


@admin.register(Candidate)
class CandidateAdmin(admin.ModelAdmin):
    list_display = ["first_name", "last_name", "email", "company", "job_post", "stage", "experience_years", "notice_period_days"]
    list_filter = ["company", "stage", "job_post"]
    search_fields = ["first_name", "last_name", "email", "phone", "current_company"]
    ordering = ["-created_at"]
    inlines = [InterviewInline]


@admin.register(Interview)
class InterviewAdmin(admin.ModelAdmin):
    list_display = ["candidate", "company", "interview_type", "scheduled_at", "duration_minutes", "status"]
    list_filter = ["company", "interview_type", "status"]
    search_fields = ["candidate__first_name", "candidate__last_name", "candidate__email"]
    date_hierarchy = "scheduled_at"
    ordering = ["-scheduled_at"]
