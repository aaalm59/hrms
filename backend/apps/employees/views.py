from rest_framework import viewsets, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend

from apps.core.permissions import IsHRAdmin, IsManager
from .models import Employee, Department, Designation, EmployeeBankDetail, EmployeeDocument, EmergencyContact
from .serializers import (
    EmployeeListSerializer, EmployeeDetailSerializer,
    DepartmentSerializer, DesignationSerializer,
    EmployeeBankDetailSerializer, EmployeeDocumentSerializer, EmergencyContactSerializer,
)
from .filters import EmployeeFilter


class DepartmentViewSet(viewsets.ModelViewSet):
    serializer_class = DepartmentSerializer
    permission_classes = [IsHRAdmin]
    filter_backends = [filters.SearchFilter]
    search_fields = ["name", "code"]

    def get_queryset(self):
        return Department.objects.filter(company=self.request.user.company)

    def perform_create(self, serializer):
        serializer.save(company=self.request.user.company)


class DesignationViewSet(viewsets.ModelViewSet):
    serializer_class = DesignationSerializer
    permission_classes = [IsHRAdmin]

    def get_queryset(self):
        return Designation.objects.filter(company=self.request.user.company)

    def perform_create(self, serializer):
        serializer.save(company=self.request.user.company)


class EmployeeViewSet(viewsets.ModelViewSet):
    permission_classes = [IsHRAdmin]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = EmployeeFilter
    search_fields = ["first_name", "last_name", "email", "employee_id", "phone"]
    ordering_fields = ["first_name", "date_of_joining", "created_at"]

    def get_queryset(self):
        return Employee.objects.filter(
            company=self.request.user.company
        ).select_related("department", "designation", "reporting_manager")

    def get_serializer_class(self):
        if self.action == "list":
            return EmployeeListSerializer
        return EmployeeDetailSerializer

    def perform_create(self, serializer):
        serializer.save(company=self.request.user.company)

    @action(detail=True, methods=["post"])
    def deactivate(self, request, pk=None):
        employee = self.get_object()
        employee.is_active = False
        employee.status = Employee.Status.INACTIVE
        employee.save()
        return Response({"detail": "Employee deactivated."})

    @action(detail=False, methods=["get"])
    def org_chart(self, request):
        employees = self.get_queryset().filter(reporting_manager__isnull=True)
        serializer = EmployeeListSerializer(employees, many=True)
        return Response(serializer.data)
