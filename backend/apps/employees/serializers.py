from rest_framework import serializers
from .models import Employee, Department, Designation, EmployeeBankDetail, EmployeeDocument, EmergencyContact


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
    bank_detail = EmployeeBankDetailSerializer(read_only=True)
    documents = EmployeeDocumentSerializer(many=True, read_only=True)
    emergency_contacts = EmergencyContactSerializer(many=True, read_only=True)
    department_name = serializers.CharField(source="department.name", read_only=True)
    designation_name = serializers.CharField(source="designation.name", read_only=True)
    manager_name = serializers.CharField(source="reporting_manager.full_name", read_only=True)

    class Meta:
        model = Employee
        exclude = ["company"]
        read_only_fields = ["id", "created_at", "updated_at"]
