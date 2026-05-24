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
        from apps.employees.models import Employee, Department
        from apps.attendance.models import Attendance
        from apps.leaves.models import LeaveRequest
        from apps.payroll.models import Payroll
        from apps.recruitment.models import JobPost, Candidate
        from django.utils import timezone
        from datetime import timedelta
        today = timezone.now().date()
        last_payroll = Payroll.all_objects.filter(company=company).order_by("-year", "-month").first()

        # Company admin users
        admin_users = User.objects.filter(
            company=company, is_super_admin=False
        ).order_by("-date_joined")[:3]
        admins_data = [{
            "id": u.id,
            "name": u.get_full_name() or u.email,
            "email": u.email,
            "status": u.status,
            "last_login": u.last_login.isoformat() if u.last_login else None,
            "roles": list(u.roles.values_list("role__name", flat=True)),
        } for u in admin_users]

        # Department headcount
        dept_data = []
        for dept in Department.all_objects.filter(company=company):
            count = Employee.all_objects.filter(company=company, department=dept, is_active=True).count()
            if count > 0:
                dept_data.append({"name": dept.name, "count": count})

        # Employee growth (last 6 months)
        growth_data = []
        for i in range(5, -1, -1):
            ref = today.replace(day=1)
            month = ref.month - i
            year = ref.year
            while month <= 0:
                month += 12
                year -= 1
            import calendar
            count = Employee.all_objects.filter(
                company=company, date_of_joining__year=year, date_of_joining__month=month
            ).count()
            growth_data.append({"month": f"{calendar.month_abbr[month]}", "joinings": count})

        # Attendance this week
        week_data = []
        for i in range(4, -1, -1):
            d = today - timedelta(days=i)
            day_qs = Attendance.all_objects.filter(company=company, date=d)
            week_data.append({
                "day": d.strftime("%a"),
                "present": day_qs.filter(status="present").count(),
                "absent": day_qs.filter(status="absent").count(),
                "leave": day_qs.filter(status="leave").count(),
            })

        return Response({
            "total_employees": company.employees_employee_set.filter(is_active=True).count(),
            "present_today": Attendance.all_objects.filter(company=company, date=today, status="present").count(),
            "on_leave_today": Attendance.all_objects.filter(company=company, date=today, status="leave").count(),
            "wfh_today": Attendance.all_objects.filter(company=company, date=today, status="wfh").count(),
            "pending_leaves": LeaveRequest.all_objects.filter(company=company, status="pending").count(),
            "open_positions": JobPost.all_objects.filter(company=company, status="open").count(),
            "candidates": Candidate.all_objects.filter(company=company).count(),
            "last_payroll": {
                "month": last_payroll.month if last_payroll else None,
                "year": last_payroll.year if last_payroll else None,
                "total_gross": float(last_payroll.total_gross) if last_payroll else 0,
                "total_net": float(last_payroll.total_net) if last_payroll else 0,
                "total_employees": last_payroll.total_employees if last_payroll else 0,
                "status": last_payroll.status if last_payroll else None,
            } if last_payroll else None,
            "admins": admins_data,
            "department_headcount": dept_data,
            "employee_growth": growth_data,
            "attendance_week": week_data,
        })

    @action(detail=True, methods=["patch"])
    def update_modules(self, request, pk=None):
        """Enable/disable HRMS modules for a company."""
        company = self.get_object()
        module_flags = request.data.get("module_flags", {})
        company.module_flags = {**company.module_flags, **module_flags}
        company.save(update_fields=["module_flags"])
        return Response({"detail": "Modules updated.", "module_flags": company.module_flags})

    @action(detail=True, methods=["post"])
    def create_admin(self, request, pk=None):
        """Create a Company Admin user for this company."""
        company = self.get_object()
        email = request.data.get("email")
        password = request.data.get("password")
        first_name = request.data.get("first_name", "")
        last_name = request.data.get("last_name", "")
        if not email or not password:
            return Response({"detail": "email and password are required."}, status=status.HTTP_400_BAD_REQUEST)
        if User.objects.filter(email=email).exists():
            return Response({"detail": "User with this email already exists."}, status=status.HTTP_400_BAD_REQUEST)
        user = User.objects.create_user(
            username=email,
            email=email,
            password=password,
            first_name=first_name,
            last_name=last_name,
            company=company,
            status="active",
        )
        # Assign company_admin role
        try:
            from apps.rbac.models import Role, UserRole
            role, _ = Role.objects.get_or_create(name="company_admin", company=company)
            UserRole.objects.get_or_create(user=user, role=role)
        except Exception:
            pass
        return Response({"detail": f"Company Admin '{email}' created successfully.", "user_id": user.id}, status=status.HTTP_201_CREATED)


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
