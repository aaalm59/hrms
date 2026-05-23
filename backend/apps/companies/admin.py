from django.contrib import admin
from .models import Company, CompanySettings, CompanyHoliday


class CompanySettingsInline(admin.StackedInline):
    model = CompanySettings
    extra = 0


@admin.register(Company)
class CompanyAdmin(admin.ModelAdmin):
    list_display = ["name", "email", "status", "employee_count", "created_at"]
    list_filter = ["status", "country"]
    search_fields = ["name", "email", "slug"]
    prepopulated_fields = {"slug": ("name",)}
    inlines = [CompanySettingsInline]


@admin.register(CompanyHoliday)
class CompanyHolidayAdmin(admin.ModelAdmin):
    list_display = ["company", "name", "date", "is_optional"]
    list_filter = ["company", "is_optional"]
