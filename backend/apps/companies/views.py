from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.utils.text import slugify
from django.contrib.auth import get_user_model

from apps.core.permissions import IsSuperAdmin, IsCompanyAdmin
from .models import Company, CompanySettings, CompanyHoliday
from .serializers import CompanySerializer, CompanyListSerializer, CompanySettingsSerializer, CompanyHolidaySerializer

User = get_user_model()


class CompanyViewSet(viewsets.ModelViewSet):
    """Super Admin: manage all companies."""

    queryset = Company.objects.all()
    permission_classes = [IsSuperAdmin]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["status", "country"]
    search_fields = ["name", "email", "slug"]
    ordering_fields = ["name", "created_at", "employee_count"]

    def get_serializer_class(self):
        if self.action == "list":
            return CompanyListSerializer
        return CompanySerializer

    def perform_create(self, serializer):
        name = serializer.validated_data["name"]
        slug = slugify(name)
        company = serializer.save(slug=slug)
        # Auto-create default settings
        CompanySettings.objects.create(
            company=company,
            working_days=["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
            weekly_off_days=["Saturday", "Sunday"],
        )

    @action(detail=True, methods=["post"])
    def activate(self, request, pk=None):
        company = self.get_object()
        company.status = Company.Status.ACTIVE
        company.is_active = True
        company.save()
        return Response({"detail": "Company activated."})

    @action(detail=True, methods=["post"])
    def suspend(self, request, pk=None):
        company = self.get_object()
        company.status = Company.Status.SUSPENDED
        company.is_active = False
        company.save()
        return Response({"detail": "Company suspended."})

    @action(detail=True, methods=["get"])
    def stats(self, request, pk=None):
        company = self.get_object()
        from apps.employees.models import Employee
        from apps.attendance.models import Attendance
        from django.utils import timezone
        today = timezone.now().date()
        return Response({
            "total_employees": company.employees_employee_set.filter(is_active=True).count(),
            "present_today": Attendance.all_objects.filter(company=company, date=today, status="present").count(),
            "on_leave_today": Attendance.all_objects.filter(company=company, date=today, status="leave").count(),
        })


class CompanySettingsViewSet(viewsets.ModelViewSet):
    serializer_class = CompanySettingsSerializer
    permission_classes = [IsCompanyAdmin]

    def get_queryset(self):
        if self.request.user.is_super_admin:
            return CompanySettings.objects.all()
        return CompanySettings.objects.filter(company=self.request.user.company)

    def get_object(self):
        return CompanySettings.objects.get(company=self.request.user.company)


class CompanyHolidayViewSet(viewsets.ModelViewSet):
    serializer_class = CompanyHolidaySerializer
    permission_classes = [IsCompanyAdmin]

    def get_queryset(self):
        if self.request.user.is_super_admin:
            company_id = self.request.query_params.get("company_id")
            if company_id:
                return CompanyHoliday.objects.filter(company_id=company_id)
            return CompanyHoliday.objects.all()
        return CompanyHoliday.objects.filter(company=self.request.user.company)

    def perform_create(self, serializer):
        serializer.save(company=self.request.user.company)
