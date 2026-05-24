from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.core.permissions import IsPayrollManager
from .models import SalaryStructure, EmployeeSalary, Payroll, Payslip
from .serializers import SalaryStructureSerializer, EmployeeSalarySerializer, PayrollSerializer, PayslipSerializer
from .tasks import process_payroll


class SalaryStructureViewSet(viewsets.ModelViewSet):
    serializer_class = SalaryStructureSerializer
    permission_classes = [IsPayrollManager]

    def get_queryset(self):
        return SalaryStructure.objects.filter(company=self.request.user.company)

    def perform_create(self, serializer):
        serializer.save(company=self.request.user.company)


class EmployeeSalaryViewSet(viewsets.ModelViewSet):
    serializer_class = EmployeeSalarySerializer
    permission_classes = [IsPayrollManager]

    def get_queryset(self):
        return EmployeeSalary.objects.filter(company=self.request.user.company).select_related("employee")

    def perform_create(self, serializer):
        serializer.save(company=self.request.user.company)


class PayrollViewSet(viewsets.ModelViewSet):
    serializer_class = PayrollSerializer
    permission_classes = [IsPayrollManager]

    def get_queryset(self):
        user = self.request.user
        if user.is_super_admin:
            company_id = self.request.query_params.get("company_id")
            qs = Payroll.objects.all()
            return qs.filter(company_id=company_id) if company_id else qs
        return Payroll.objects.filter(company=user.company)

    def perform_create(self, serializer):
        serializer.save(company=self.request.user.company)

    @action(detail=True, methods=["post"])
    def process(self, request, pk=None):
        payroll = self.get_object()
        if payroll.status != Payroll.Status.DRAFT:
            return Response({"detail": "Only draft payrolls can be processed."}, status=status.HTTP_400_BAD_REQUEST)
        payroll.status = Payroll.Status.PROCESSING
        payroll.save()
        process_payroll.delay(payroll.id)
        return Response({"detail": "Payroll processing started."})

    @action(detail=True, methods=["get"])
    def payslips(self, request, pk=None):
        payroll = self.get_object()
        serializer = PayslipSerializer(payroll.payslips.all(), many=True)
        return Response(serializer.data)


class PayslipViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = PayslipSerializer

    def get_queryset(self):
        user = self.request.user
        if user.is_super_admin:
            company_id = self.request.query_params.get("company_id")
            qs = Payslip.objects.all()
            if company_id:
                qs = qs.filter(company_id=company_id)
            return qs
        qs = Payslip.objects.filter(company=user.company)
        if not (user.has_role("payroll_manager") or user.has_role("hr_admin")):
            qs = qs.filter(employee__user=user)
        return qs
