from django.contrib import admin
from .models import Team, Department, Designation, Employee, EmployeeBankDetail, EmployeeDocument, EmergencyContact


class EmployeeBankDetailInline(admin.StackedInline):
    model = EmployeeBankDetail
    extra = 0


class EmployeeDocumentInline(admin.TabularInline):
    model = EmployeeDocument
    extra = 0
    fields = ["document_type", "name", "file", "uploaded_at"]
    readonly_fields = ["uploaded_at"]


class EmergencyContactInline(admin.TabularInline):
    model = EmergencyContact
    extra = 0
    fields = ["name", "relationship", "phone", "alternate_phone"]


@admin.register(Team)
class TeamAdmin(admin.ModelAdmin):
    list_display = ["name", "company", "lead"]
    list_filter = ["company"]
    search_fields = ["name"]


@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    list_display = ["name", "code", "company", "manager", "parent"]
    list_filter = ["company"]
    search_fields = ["name", "code"]


@admin.register(Designation)
class DesignationAdmin(admin.ModelAdmin):
    list_display = ["name", "company", "department", "level"]
    list_filter = ["company", "department"]
    search_fields = ["name"]


@admin.register(Employee)
class EmployeeAdmin(admin.ModelAdmin):
    list_display = ["employee_id", "full_name", "company", "department", "designation", "employment_type", "status", "date_of_joining", "is_active"]
    list_filter = ["company", "status", "employment_type", "department", "is_active"]
    search_fields = ["employee_id", "first_name", "last_name", "email", "phone"]
    date_hierarchy = "date_of_joining"
    ordering = ["first_name", "last_name"]
    inlines = [EmployeeBankDetailInline, EmployeeDocumentInline, EmergencyContactInline]
    fieldsets = (
        ("Identity", {"fields": ("company", "employee_id", "user", "first_name", "last_name", "email", "personal_email", "phone", "alternate_phone", "gender", "date_of_birth", "photo")}),
        ("Professional", {"fields": ("department", "designation", "team", "reporting_manager", "employment_type", "date_of_joining", "date_of_leaving", "probation_end_date", "status", "is_active")}),
        ("Government IDs", {"fields": ("pan_number", "aadhar_number", "pf_number", "uan_number", "esi_number"), "classes": ("collapse",)}),
        ("Address", {"fields": ("current_address", "permanent_address", "city", "state", "pincode"), "classes": ("collapse",)}),
    )


@admin.register(EmployeeBankDetail)
class EmployeeBankDetailAdmin(admin.ModelAdmin):
    list_display = ["employee", "company", "bank_name", "account_number", "ifsc_code", "account_type"]
    list_filter = ["company", "account_type"]
    search_fields = ["employee__first_name", "employee__last_name", "bank_name", "account_number"]


@admin.register(EmployeeDocument)
class EmployeeDocumentAdmin(admin.ModelAdmin):
    list_display = ["employee", "company", "document_type", "name", "uploaded_at"]
    list_filter = ["company", "document_type"]
    search_fields = ["employee__first_name", "employee__last_name", "name"]
    date_hierarchy = "uploaded_at"


@admin.register(EmergencyContact)
class EmergencyContactAdmin(admin.ModelAdmin):
    list_display = ["employee", "company", "name", "relationship", "phone"]
    list_filter = ["company"]
    search_fields = ["employee__first_name", "employee__last_name", "name", "phone"]
