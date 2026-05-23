from rest_framework.views import APIView
from rest_framework.response import Response
from django.utils import timezone
from django.db.models import Count, Sum, Q, Avg

from apps.core.permissions import IsSuperAdmin, IsCompanyAdmin, IsHRAdmin


class SuperAdminDashboardView(APIView):
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
                "half_day": attendance_today.filter(status="half_day").count(),
            },
            "pending_leaves": pending_leaves,
        })


class HRDashboardView(APIView):
    permission_classes = [IsHRAdmin]

    def get(self, request):
        from apps.employees.models import Employee, Department
        from apps.recruitment.models import JobPost, Candidate
        from apps.leaves.models import LeaveRequest
        from apps.attendance.models import Attendance
        from datetime import date, timedelta

        company = request.user.company
        today = timezone.now().date()
        current_month = today.month
        current_year = today.year

        # Attendance today
        attendance_today = Attendance.all_objects.filter(company=company, date=today)

        # Weekly trend (last 7 working days)
        week_trend = []
        for i in range(4, -1, -1):
            d = today - timedelta(days=i)
            day_qs = Attendance.all_objects.filter(company=company, date=d)
            week_trend.append({
                "day": d.strftime("%a"),
                "present": day_qs.filter(status="present").count(),
                "absent": day_qs.filter(status="absent").count(),
                "leave": day_qs.filter(status="leave").count(),
            })

        # Department headcount
        departments = Department.all_objects.filter(company=company)
        dept_headcount = []
        for dept in departments:
            count = Employee.all_objects.filter(company=company, department=dept, is_active=True).count()
            if count > 0:
                dept_headcount.append({"name": dept.name, "count": count})

        # Leave distribution by type (current year)
        from apps.leaves.models import LeaveBalance
        leave_dist = (
            LeaveBalance.all_objects.filter(company=company, year=current_year)
            .values("leave_type__name")
            .annotate(value=Sum("used_days"))
            .filter(value__gt=0)
        )
        leave_distribution = [{"name": l["leave_type__name"], "value": float(l["value"])} for l in leave_dist]

        total_employees = Employee.all_objects.filter(company=company, is_active=True).count()

        return Response({
            "total_employees": total_employees,
            "present_today": attendance_today.filter(status="present").count(),
            "absent": attendance_today.filter(status="absent").count(),
            "on_leave": attendance_today.filter(status="leave").count(),
            "new_joinings_this_month": Employee.all_objects.filter(
                company=company,
                date_of_joining__month=current_month,
                date_of_joining__year=current_year,
            ).count(),
            "open_positions": JobPost.all_objects.filter(company=company, status="open").count(),
            "candidates_in_pipeline": Candidate.all_objects.filter(
                company=company
            ).exclude(current_stage__in=["hired", "rejected", "withdrawn"]).count(),
            "pending_leave_requests": LeaveRequest.all_objects.filter(company=company, status="pending").count(),
            "attendance_trend": week_trend,
            "department_headcount": dept_headcount,
            "leave_distribution": leave_distribution,
        })


class EmployeeDashboardView(APIView):
    def get(self, request):
        from apps.attendance.models import Attendance
        from apps.leaves.models import LeaveBalance, LeaveRequest
        from apps.payroll.models import Payslip

        employee = getattr(request.user, 'employee_profile', None)
        if not employee:
            return Response({})

        today = timezone.now().date()
        current_year = today.year

        checked_in = False
        check_in_time = None
        working_hours_today = None

        try:
            attendance_today = Attendance.all_objects.get(
                company=request.user.company, employee=employee, date=today
            )
            checked_in = bool(attendance_today.check_in)
            if attendance_today.check_in:
                check_in_time = attendance_today.check_in.strftime("%H:%M")
            if attendance_today.working_hours:
                working_hours_today = float(attendance_today.working_hours)
        except Attendance.DoesNotExist:
            pass

        leave_balances = list(
            LeaveBalance.all_objects.filter(
                company=request.user.company, employee=employee, year=current_year
            ).values("leave_type__name", "total_days", "used_days")
        )

        recent_payslips = list(
            Payslip.all_objects.filter(
                company=request.user.company, employee=employee
            ).order_by("-created_at")
            .values("id", "payroll__month", "payroll__year", "net_salary")[:3]
        )

        return Response({
            "checked_in_today": checked_in,
            "check_in_time": check_in_time,
            "working_hours_today": working_hours_today,
            "leave_balances": leave_balances,
            "pending_leave_requests": LeaveRequest.all_objects.filter(
                company=request.user.company, employee=employee, status="pending"
            ).count(),
            "recent_payslips": recent_payslips,
        })
