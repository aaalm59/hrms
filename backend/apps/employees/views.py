from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend

from apps.core.permissions import IsHRAdmin, IsManager
from .models import Employee, Department, Designation, EmployeeBankDetail, EmployeeDocument, EmergencyContact, Team
from .serializers import (
    EmployeeListSerializer, EmployeeDetailSerializer,
    DepartmentSerializer, DesignationSerializer,
    EmployeeBankDetailSerializer, EmployeeDocumentSerializer, EmergencyContactSerializer,
    TeamSerializer,
)
from .filters import EmployeeFilter


def _company_id(request):
    """Return the company_id for the current request user. None for super admins."""
    return None if request.user.is_super_admin else request.user.company_id


class TeamViewSet(viewsets.ModelViewSet):
    serializer_class = TeamSerializer
    permission_classes = [IsHRAdmin]
    filter_backends = [filters.SearchFilter]
    search_fields = ["name"]

    def get_queryset(self):
        cid = _company_id(self.request)
        if cid is None:
            return Team.all_objects.none()
        return Team.all_objects.filter(company_id=cid).select_related("lead")

    def perform_create(self, serializer):
        serializer.save(company=self.request.user.company)

    @action(detail=True, methods=["get"])
    def members(self, request, pk=None):
        from apps.attendance.models import Attendance
        cid = _company_id(request)
        if not cid:
            return Response({"members": [], "date": timezone.now().date().isoformat()})

        team = self.get_object()
        today = timezone.now().date()

        # Explicit company_id guard on the employee query — no reverse FK manager
        members = list(
            Employee.all_objects.filter(
                team=team, company_id=cid, is_active=True
            ).select_related("designation")
        )
        member_ids = [m.id for m in members]

        attendance_map = {
            att.employee_id: att
            for att in Attendance.all_objects.filter(
                company_id=cid,
                employee_id__in=member_ids,
                date=today,
            )
        }

        data = []
        for emp in members:
            att = attendance_map.get(emp.id)
            data.append({
                "id": emp.id,
                "employee_id": emp.employee_id,
                "name": emp.full_name,
                "email": emp.email,
                "designation": emp.designation.name if emp.designation else None,
                "attendance_status": att.status if att else "absent",
                "check_in": att.check_in.strftime("%H:%M") if att and att.check_in else None,
                "check_out": att.check_out.strftime("%H:%M") if att and att.check_out else None,
            })

        return Response({"members": data, "date": today.isoformat()})

    @action(detail=True, methods=["post"])
    def assign_members(self, request, pk=None):
        cid = _company_id(request)
        if not cid:
            return Response({"detail": "Not allowed."}, status=status.HTTP_403_FORBIDDEN)

        team = self.get_object()
        employee_ids = request.data.get("employee_ids", [])
        if not employee_ids:
            return Response({"detail": "No employee IDs provided."}, status=status.HTTP_400_BAD_REQUEST)

        # company_id guard prevents assigning employees from other companies
        updated = Employee.all_objects.filter(
            company_id=cid, id__in=employee_ids
        ).update(team=team)

        return Response({"detail": f"{updated} employees assigned to {team.name}."})

    @action(detail=True, methods=["post"])
    def remove_member(self, request, pk=None):
        cid = _company_id(request)
        if not cid:
            return Response({"detail": "Not allowed."}, status=status.HTTP_403_FORBIDDEN)

        team = self.get_object()
        employee_id = request.data.get("employee_id")

        try:
            emp = Employee.all_objects.get(company_id=cid, id=employee_id, team=team)
            emp.team = None
            emp.save(update_fields=["team"])
            return Response({"detail": "Member removed."})
        except Employee.DoesNotExist:
            return Response(
                {"detail": "Employee not found in this team."},
                status=status.HTTP_400_BAD_REQUEST,
            )


class DepartmentViewSet(viewsets.ModelViewSet):
    serializer_class = DepartmentSerializer
    permission_classes = [IsHRAdmin]
    filter_backends = [filters.SearchFilter]
    search_fields = ["name", "code"]

    def get_queryset(self):
        user = self.request.user
        if user.is_super_admin:
            company_id = self.request.query_params.get("company_id")
            qs = Department.all_objects.all()
            return qs.filter(company_id=company_id) if company_id else qs.none()
        if not user.company_id:
            return Department.all_objects.none()
        return Department.all_objects.filter(company_id=user.company_id)

    def perform_create(self, serializer):
        serializer.save(company=self.request.user.company)


class DesignationViewSet(viewsets.ModelViewSet):
    serializer_class = DesignationSerializer
    permission_classes = [IsHRAdmin]

    def get_queryset(self):
        cid = _company_id(self.request)
        if not cid:
            return Designation.all_objects.none()
        return Designation.all_objects.filter(company_id=cid)

    def perform_create(self, serializer):
        serializer.save(company=self.request.user.company)


class EmployeeViewSet(viewsets.ModelViewSet):
    permission_classes = [IsHRAdmin]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = EmployeeFilter
    search_fields = ["first_name", "last_name", "email", "employee_id", "phone"]
    ordering_fields = ["first_name", "date_of_joining", "created_at"]

    def get_queryset(self):
        user = self.request.user
        if user.is_super_admin:
            company_id = self.request.query_params.get("company_id")
            qs = Employee.all_objects.all()
            if company_id:
                qs = qs.filter(company_id=company_id)
            return qs.select_related("department", "designation", "reporting_manager")
        # Non-super-admin: always scope to own company
        if not user.company_id:
            return Employee.all_objects.none()
        return Employee.all_objects.filter(
            company_id=user.company_id
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