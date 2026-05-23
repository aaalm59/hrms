from rest_framework import serializers
from .models import SalaryStructure, SalaryComponent, EmployeeSalary, Payroll, Payslip


class SalaryComponentSerializer(serializers.ModelSerializer):
    class Meta:
        model = SalaryComponent
        exclude = ["company"]


class SalaryStructureSerializer(serializers.ModelSerializer):
    components = SalaryComponentSerializer(many=True, read_only=True)

    class Meta:
        model = SalaryStructure
        exclude = ["company"]


class EmployeeSalarySerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source="employee.full_name", read_only=True)
    structure_name = serializers.CharField(source="salary_structure.name", read_only=True)

    class Meta:
        model = EmployeeSalary
        exclude = ["company"]


class PayslipSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source="employee.full_name", read_only=True)
    employee_id = serializers.CharField(source="employee.employee_id", read_only=True)

    class Meta:
        model = Payslip
        exclude = ["company"]
        read_only_fields = ["id", "created_at", "updated_at"]


class PayrollSerializer(serializers.ModelSerializer):
    payslip_count = serializers.SerializerMethodField()

    class Meta:
        model = Payroll
        exclude = ["company"]
        read_only_fields = ["id", "total_employees", "total_gross", "total_deductions", "total_net", "processed_by", "processed_at"]

    def get_payslip_count(self, obj):
        return obj.payslips.count()
