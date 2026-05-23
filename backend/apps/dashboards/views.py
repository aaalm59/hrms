from rest_framework.views import APIView
from rest_framework.response import Response
from django.utils import timezone
from django.db.models import Count, Sum, Q

from apps.core.permissions import IsSuperAdmin, IsCompanyAdmin, IsHRAdmin


class SuperAdminDashboardView(APIView):
    """Platform-level analytics — Super Admin only."""
    permission_classes = [IsSuperAdmin]

    def get(self, request):
        from apps.companies.models import Company
        from apps.authentication.models import User
        from apps.subscriptions.models import Subscription

        companies = Company.objects.all()
        return Response({
            "companies": {
                "total": companies.count(),
                "active": companies.filter(status="active").count(),
                "suspended": companies.filter(status="suspended").count(),
                "trial": companies.filter(status="trial").count(),
            },
            "users": {
                "total": User.objects.filter(is_super_admin=False).count(),
                "active": User.objects.filter(is_super_admin=False, status="active").count(),
            },
            "revenue": {
                "subscriptions": Subscription.objects.filter(status="active").count(),
            },
        })


class CompanyAdminDashboardView(APIView):
    """Company-level overview."""
    permission_classes = [IsCompanyAdmin]

    def get(self, request):
        from apps.employees.models import Employee
        from apps.attendance.models import Attendance
        from apps.leaves.models import LeaveRequest
        from apps.payroll.models import Payroll

        company = request.user.company
        today = timezone.now().date()

        attendance_today = Attendance.all_objects.filter(company=company, date=today)
        pending_leaves = LeaveRequest.all_objects.filter(company=company, status="pending").count()

        return Response({
            "employees": {
                "total": Employee.all_objects.filter(company=company, is_active=True).count(),
            },
            "attendance_today": {
                "present": attendance_today.filter(status="present").count(),
                "absent": attendance_today.filter(status="absent").count(),
                "on_leave": attendance_today.filter(status="leave").count(),
                "wfh": attendance_today.filter(status="wfh").count(),
            },
            "pending_leaves": pending_leaves,
        })


class HRDashboardView(APIView):
    permission_classes = [IsHRAdmin]

    def get(self, request):
        from apps.employees.models import Employee
        from apps.recruitment.models import JobPost, Candidate
        from apps.leaves.models import LeaveRequest

        company = request.user.company
        current_month = timezone.now().month
        current_year = timezone.now().year

        return Response({
            "new_joinings_this_month": Employee.all_objects.filter(
                company=company,
                date_of_joining__month=current_month,
                date_of_joining__year=current_year,
            ).count(),
            "open_positions": JobPost.all_objects.filter(company=company, status="open").count(),
            "candidates_in_pipeline": Candidate.all_objects.filter(
                company=company
            ).exclude(stage__in=["hired", "rejected", "withdrawn"]).count(),
            "pending_leave_approvals": LeaveRequest.all_objects.filter(company=company, status="pending").count(),
        })


class EmployeeDashboardView(APIView):
    def get(self, request):
        from apps.attendance.models import Attendance
        from apps.leaves.models import LeaveBalance, LeaveRequest
        from apps.payroll.models import Payslip

        employee = request.user.employee_profile
        if not employee:
            return Response({})

        today = timezone.now().date()
        current_year = today.year
        try:
            attendance_today = Attendance.all_objects.get(
                company=request.user.company, employee=employee, date=today
            )
            checked_in = bool(attendance_today.check_in)
        except Attendance.DoesNotExist:
            checked_in = False

        leave_balances = LeaveBalance.all_objects.filter(
            company=request.user.company, employee=employee, year=current_year
        ).values("leave_type__name", "total_days", "used_days")

        return Response({
            "checked_in_today": checked_in,
            "leave_balances": list(leave_balances),
            "pending_leave_requests": LeaveRequest.all_objects.filter(
                company=request.user.company, employee=employee, status="pending"
            ).count(),
            "recent_payslips": Payslip.all_objects.filter(
                company=request.user.company, employee=employee
            ).order_by("-created_at").values("id", "payroll__month", "payroll__year", "net_salary")[:3],
        })
