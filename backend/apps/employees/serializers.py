import re

from django.contrib.auth import get_user_model
from rest_framework import serializers

from apps.rbac.models import Role, UserRole
from .models import Employee, Department, Designation, EmployeeBankDetail, EmployeeDocument, EmergencyContact, Team

User = get_user_model()


class TeamSerializer(serializers.ModelSerializer):
    member_count = serializers.SerializerMethodField()
    lead_name = serializers.CharField(source="lead.full_name", read_only=True)
    today_present = serializers.SerializerMethodField()
    today_absent = serializers.SerializerMethodField()

    class Meta:
        model = Team
        exclude = ["company"]

    def get_member_count(self, obj):
        # Use all_objects + explicit company_id — never rely on reverse FK manager
        return Employee.all_objects.filter(
            team=obj, company_id=obj.company_id, is_active=True
        ).count()

    def get_today_present(self, obj):
        from django.utils import timezone
        from apps.attendance.models import Attendance
        today = timezone.now().date()
        return Attendance.all_objects.filter(
            company_id=obj.company_id,
            employee__team=obj,
            employee__is_active=True,
            date=today,
            status__in=["present", "wfh", "half_day"],
        ).count()

    def get_today_absent(self, obj):
        from django.utils import timezone
        from apps.attendance.models import Attendance
        today = timezone.now().date()
        total = Employee.all_objects.filter(team=obj, company_id=obj.company_id, is_active=True).count()
        accounted = Attendance.all_objects.filter(
            company_id=obj.company_id,
            employee__team=obj,
            employee__is_active=True,
            date=today,
            status__in=["present", "wfh", "half_day", "leave"],
        ).count()
        return max(0, total - accounted)


class DepartmentSerializer(serializers.ModelSerializer):
    employee_count = serializers.SerializerMethodField()

    class Meta:
        model = Department
        exclude = ["company"]

    def get_employee_count(self, obj):
        return obj.employees.filter(is_active=True).count()


class DesignationSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source="department.name", read_only=True)

    class Meta:
        model = Designation
        exclude = ["company"]


class EmployeeBankDetailSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmployeeBankDetail
        exclude = ["company", "employee"]


class EmployeeDocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmployeeDocument
        exclude = ["company"]
        read_only_fields = ["uploaded_at"]


class EmergencyContactSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmergencyContact
        exclude = ["company", "employee"]


class EmployeeListSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source="department.name", read_only=True)
    designation_name = serializers.CharField(source="designation.name", read_only=True)
    company_name = serializers.CharField(source="company.name", read_only=True)

    class Meta:
        model = Employee
        fields = [
            "id", "employee_id", "first_name", "last_name", "email",
            "phone", "photo", "department_name", "designation_name",
            "status", "date_of_joining", "employment_type", "company_name",
        ]


class EmployeeDetailSerializer(serializers.ModelSerializer):
    employee_id = serializers.CharField(required=False, allow_blank=True)
    role_name = serializers.CharField(write_only=True, required=False, default="employee")
    password = serializers.CharField(write_only=True, required=False, default="Welcome@123")
    bank_detail = EmployeeBankDetailSerializer(read_only=True)
    documents = EmployeeDocumentSerializer(many=True, read_only=True)
    emergency_contacts = EmergencyContactSerializer(many=True, read_only=True)
    department_name = serializers.CharField(source="department.name", read_only=True)
    designation_name = serializers.CharField(source="designation.name", read_only=True)
    manager_name = serializers.CharField(source="reporting_manager.full_name", read_only=True)
    team_name = serializers.CharField(source="team.name", read_only=True)

    class Meta:
        model = Employee
        exclude = ["company"]
        read_only_fields = ["id", "created_at", "updated_at"]

    def create(self, validated_data):
        role_name = validated_data.pop("role_name", "employee")
        password = validated_data.pop("password", "Welcome@123")

        if not validated_data.get("employee_id"):
            company = validated_data.get("company")
            validated_data["employee_id"] = self._next_employee_id(company)

        company = validated_data.get("company")
        email = validated_data.get("email")

        user, created = User.objects.get_or_create(
            email=email,
            defaults={
                "username": email,
                "first_name": validated_data.get("first_name", ""),
                "last_name": validated_data.get("last_name", ""),
                "company": company,
            },
        )
        if created:
            user.set_password(password)
            user.save()

        role = (
            Role.objects.filter(name=role_name, company=company).first()
            or Role.objects.filter(name=role_name, company=None).first()
        )
        if role:
            UserRole.objects.get_or_create(user=user, role=role)

        validated_data["user"] = user
        return super().create(validated_data)

    def _next_employee_id(self, company):
        employee_ids = Employee.all_objects.filter(company=company).values_list("employee_id", flat=True)
        max_number = 0
        for employee_id in employee_ids:
            match = re.fullmatch(r"EMP(\d+)", employee_id or "")
            if match:
                max_number = max(max_number, int(match.group(1)))
        return f"EMP{max_number + 1:03d}"
