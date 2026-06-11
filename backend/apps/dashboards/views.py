from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from django.utils import timezone
from django.db.models import Count, Sum, Q, Avg

from apps.core.permissions import IsSuperAdmin, IsCompanyAdmin, IsHRAdmin, IsPayrollManager, IsRecruiter, IsTeamLead


class SuperAdminDashboardView(APIView):
    permission_classes = [IsSuperAdmin]

    def get(self, request):
        from apps.companies.models import Company
        from apps.authentication.models import User
        from apps.subscriptions.models import Subscription, Plan
        from apps.employees.models import Employee
        from apps.audit_logs.models import ActivityLog, LoginLog
        from datetime import timedelta

        today = timezone.now().date()
        now = timezone.now()

        companies = Company.objects.all()

        # Company status breakdown
        company_stats = {
            "total": companies.count(),
            "active": companies.filter(status="active").count(),
            "suspended": companies.filter(status="suspended").count(),
            "trial": companies.filter(status="trial").count(),
            "inactive": companies.filter(status="inactive").count(),
            "new_this_month": companies.filter(
                created_at__year=today.year, created_at__month=today.month
            ).count(),
        }

        # Platform totals
        total_employees = Employee.objects.filter(is_active=True).count()
        total_users = User.objects.filter(is_super_admin=False).count()
        active_users = User.objects.filter(is_super_admin=False, status="active").count()

        # MRR – sum plan monthly price for active subscriptions
        active_subs = Subscription.objects.filter(status="active").select_related("plan")
        mrr = sum(float(s.plan.price_monthly) for s in active_subs)
        active_subscription_count = active_subs.count()

        # Company growth — last 6 months
        company_growth = []
        for i in range(5, -1, -1):
            ref = today.replace(day=1)
            if i > 0:
                # go back i months
                month = ref.month - i
                year = ref.year
                while month <= 0:
                    month += 12
                    year -= 1
            else:
                month, year = ref.month, ref.year
            count = companies.filter(created_at__year=year, created_at__month=month).count()
            import calendar
            company_growth.append({
                "month": f"{calendar.month_abbr[month]} {str(year)[-2:]}",
                "organizations": count,
                "employees": Employee.objects.filter(
                    date_of_joining__year=year, date_of_joining__month=month
                ).count(),
            })

        # Plan distribution
        plan_distribution = []
        for plan in Plan.objects.filter(is_active=True):
            count = Subscription.objects.filter(plan=plan, status__in=["active", "trial"]).count()
            plan_distribution.append({
                "name": plan.name,
                "tier": plan.tier,
                "count": count,
                "revenue": float(plan.price_monthly) * count,
            })

        # Top organizations
        top_companies = []
        for company in companies.order_by("-created_at")[:15]:
            emp_count = Employee.objects.filter(company=company, is_active=True).count()
            sub = getattr(company, "subscription", None)
            top_companies.append({
                "id": company.id,
                "name": company.name,
                "slug": company.slug,
                "status": company.status,
                "employee_count": emp_count,
                "plan": sub.plan.name if sub else "—",
                "subscription_status": sub.status if sub else "none",
                "created_at": company.created_at.date().isoformat(),
                "city": company.city or company.country,
            })
        top_companies.sort(key=lambda x: x["employee_count"], reverse=True)

        # Recent activity
        recent_activity = []
        for log in ActivityLog.objects.select_related("user", "company").order_by("-created_at")[:8]:
            recent_activity.append({
                "user": log.user.email if log.user else "—",
                "company": log.company.name if log.company else "Platform",
                "action": log.action,
                "model": log.model_name,
                "description": log.description,
                "created_at": log.created_at.isoformat(),
            })

        # Security metrics
        failed_logins_24h = LoginLog.objects.filter(
            status="failed", created_at__gte=now - timedelta(hours=24)
        ).count()
        failed_logins_7d = LoginLog.objects.filter(
            status="failed", created_at__gte=now - timedelta(days=7)
        ).count()

        return Response({
            "companies": company_stats,
            "total_employees": total_employees,
            "total_users": total_users,
            "active_users": active_users,
            "mrr": round(mrr, 2),
            "active_subscriptions": active_subscription_count,
            "company_growth": company_growth,
            "plan_distribution": plan_distribution,
            "top_companies": top_companies,
            "recent_activity": recent_activity,
            "security": {
                "failed_logins_24h": failed_logins_24h,
                "failed_logins_7d": failed_logins_7d,
            },
        })


class CompanyAdminDashboardView(APIView):
    permission_classes = [IsCompanyAdmin]

    def get(self, request):
        if request.user.is_super_admin:
            return Response(
                {"detail": "Super admin must use the super admin dashboard."},
                status=status.HTTP_403_FORBIDDEN,
            )

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
        if request.user.is_super_admin:
            return Response(
                {"detail": "Super admin must use the super admin dashboard."},
                status=status.HTTP_403_FORBIDDEN,
            )

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
            ).exclude(stage__in=["hired", "rejected", "withdrawn"]).count(),
            "pending_leave_requests": LeaveRequest.all_objects.filter(company=company, status="pending").count(),
            "attendance_trend": week_trend,
            "department_headcount": dept_headcount,
            "leave_distribution": leave_distribution,
        })


def _scoped_employee_queryset(user):
    from apps.employees.models import Employee

    if user.is_super_admin:
        return Employee.all_objects.none()
    qs = Employee.all_objects.filter(company=user.company, is_active=True).select_related("department", "designation", "team")
    if user.has_role("company_admin") or user.has_role("hr_admin"):
        return qs
    employee = getattr(user, "employee_profile", None)
    if not employee:
        return qs.none()
    if user.has_role("manager") or user.has_role("team_lead"):
        return qs.filter(
            Q(id=employee.id)
            | Q(reporting_manager=employee)
            | Q(team__lead=employee)
            | Q(team__reporting_manager=employee)
        ).distinct()
    if employee.team_id:
        return qs.filter(team_id=employee.team_id)
    return qs.filter(id=employee.id)


def _weekly_off_indexes(company):
    day_map = {
        "Monday": 0,
        "Tuesday": 1,
        "Wednesday": 2,
        "Thursday": 3,
        "Friday": 4,
        "Saturday": 5,
        "Sunday": 6,
    }
    settings = getattr(company, "settings", None)
    weekly = getattr(settings, "weekly_off_days", None) or ["Saturday", "Sunday"]
    return [day_map.get(day, 6) for day in weekly]


class EmployeeDashboardView(APIView):
    def get(self, request):
        from apps.attendance.models import Attendance
        from apps.leaves.models import Holiday, LeaveBalance, LeaveRequest
        from apps.payroll.models import Payslip
        from apps.attendance.models import Shift
        from datetime import timedelta

        employee = getattr(request.user, 'employee_profile', None)
        if not employee:
            return Response({})

        today = timezone.now().date()
        current_year = today.year
        company = request.user.company
        scoped_employees = _scoped_employee_queryset(request.user)
        scoped_ids = list(scoped_employees.values_list("id", flat=True))

        checked_in = False
        check_in_time = None
        check_out_time = None
        working_hours_today = None
        late_alert = None
        attendance_today = None

        try:
            attendance_today = Attendance.all_objects.get(
                company=company, employee=employee, date=today
            )
            checked_in = bool(attendance_today.check_in)
            if attendance_today.check_in:
                check_in_time = attendance_today.check_in.strftime("%H:%M")
            if attendance_today.check_out:
                check_out_time = attendance_today.check_out.strftime("%H:%M")
            if attendance_today.working_hours:
                working_hours_today = float(attendance_today.working_hours)
            if attendance_today.is_late:
                late_alert = f"Late by {attendance_today.late_minutes} minutes"
        except Attendance.DoesNotExist:
            pass

        active_shift = (
            attendance_today.shift if attendance_today and attendance_today.shift_id
            else Shift.all_objects.filter(company=company).order_by("start_time").first()
        )

        leave_balances = list(
            LeaveBalance.all_objects.filter(
                company=company, employee=employee, year=current_year
            ).values("leave_type__name", "leave_type__code", "total_days", "used_days", "pending_days", "carried_forward")
        )

        recent_payslips = list(
            Payslip.all_objects.filter(
                company=company, employee=employee
            ).order_by("-created_at")
            .values("id", "payroll__month", "payroll__year", "net_salary")[:3]
        )

        attendance_scope_today = Attendance.all_objects.filter(company=company, employee_id__in=scoped_ids, date=today)
        attendance_map = {item.employee_id: item for item in attendance_scope_today}
        approved_leaves_today = LeaveRequest.all_objects.filter(
            company=company,
            employee_id__in=scoped_ids,
            status=LeaveRequest.Status.APPROVED,
            from_date__lte=today,
            to_date__gte=today,
        )
        leave_employee_ids = set(approved_leaves_today.values_list("employee_id", flat=True))
        present_ids = set(attendance_scope_today.filter(status=Attendance.Status.PRESENT).values_list("employee_id", flat=True))
        wfh_ids = set(attendance_scope_today.filter(status=Attendance.Status.WORK_FROM_HOME).values_list("employee_id", flat=True))
        late_ids = set(attendance_scope_today.filter(is_late=True).values_list("employee_id", flat=True))
        remote_ids = set(attendance_scope_today.filter(check_in_location__isnull=False).values_list("employee_id", flat=True))
        team_available = len(set(scoped_ids) - leave_employee_ids - set(attendance_scope_today.filter(status=Attendance.Status.ABSENT).values_list("employee_id", flat=True)))

        members_data = []
        for member in scoped_employees[:40]:
            att = attendance_map.get(member.id)
            members_data.append({
                "id": member.id,
                "name": member.full_name,
                "is_self": member.id == employee.id,
                "designation": member.designation.name if member.designation else None,
                "team": member.team.name if member.team else None,
                "attendance_status": "leave" if member.id in leave_employee_ids else (att.status if att else "not_marked"),
                "check_in": att.check_in.strftime("%H:%M") if att and att.check_in else None,
                "check_out": att.check_out.strftime("%H:%M") if att and att.check_out else None,
                "is_late": bool(att and att.is_late),
                "is_remote": bool(att and att.check_in_location),
            })

        history = []
        for item in Attendance.all_objects.filter(company=company, employee=employee).select_related("shift").order_by("-date")[:10]:
            history.append({
                "date": item.date.isoformat(),
                "status": item.status,
                "check_in": item.check_in.strftime("%H:%M") if item.check_in else None,
                "check_out": item.check_out.strftime("%H:%M") if item.check_out else None,
                "working_hours": float(item.working_hours or 0),
                "is_late": item.is_late,
                "late_minutes": item.late_minutes,
                "shift": item.shift.name if item.shift else None,
            })

        attendance_trend = []
        for i in range(6, -1, -1):
            day = today - timedelta(days=i)
            day_qs = Attendance.all_objects.filter(company=company, employee_id__in=scoped_ids, date=day)
            attendance_trend.append({
                "day": day.strftime("%a"),
                "date": day.isoformat(),
                "present": day_qs.filter(status=Attendance.Status.PRESENT).count(),
                "wfh": day_qs.filter(status=Attendance.Status.WORK_FROM_HOME).count(),
                "late": day_qs.filter(is_late=True).count(),
                "absent": day_qs.filter(status=Attendance.Status.ABSENT).count(),
            })

        leave_trend = []
        for month in range(1, 13):
            month_qs = LeaveRequest.all_objects.filter(company=company, employee_id__in=scoped_ids, from_date__year=current_year, from_date__month=month)
            leave_trend.append({
                "month": month,
                "approved": month_qs.filter(status=LeaveRequest.Status.APPROVED).count(),
                "pending": month_qs.filter(status__in=[LeaveRequest.Status.PENDING, LeaveRequest.Status.MANAGER_APPROVED, LeaveRequest.Status.ESCALATED]).count(),
            })

        holidays_this_month = list(
            Holiday.all_objects.filter(company=company, is_active=True, date__year=today.year, date__month=today.month)
            .values("name", "date", "holiday_type")
        )

        return Response({
            "checked_in_today": checked_in,
            "check_in_time": check_in_time,
            "check_out_time": check_out_time,
            "working_hours_today": working_hours_today,
            "live_working_seconds": int((timezone.now() - attendance_today.check_in).total_seconds()) if attendance_today and attendance_today.check_in and not attendance_today.check_out else 0,
            "late_alert": late_alert,
            "today_status": attendance_today.status if attendance_today else "not_marked",
            "shift": {
                "name": active_shift.name if active_shift else None,
                "start_time": active_shift.start_time.strftime("%H:%M") if active_shift else None,
                "end_time": active_shift.end_time.strftime("%H:%M") if active_shift else None,
                "grace_minutes": active_shift.grace_minutes if active_shift else None,
            },
            "leave_balances": leave_balances,
            "pending_leave_requests": LeaveRequest.all_objects.filter(
                company=company, employee=employee, status__in=["pending", "manager_approved", "escalated"]
            ).count(),
            "recent_payslips": recent_payslips,
            "team": {
                "id": employee.team_id,
                "name": employee.team.name if employee.team else "My Team",
                "lead_name": employee.team.lead.full_name if employee.team and employee.team.lead else None,
                "total_members": len(scoped_ids),
                "members": members_data,
            },
            "widgets": {
                "employees_on_time": len(present_ids - late_ids),
                "late_arrivals": len(late_ids),
                "work_from_home": len(wfh_ids),
                "remote_clockins": len(remote_ids),
                "team_available": team_available,
                "team_total": len(scoped_ids),
                "on_leave": len(leave_employee_ids),
            },
            "attendance_history": history,
            "attendance_trend": attendance_trend,
            "leave_trend": leave_trend,
            "holidays_this_month": holidays_this_month,
        })


class PayrollManagerDashboardView(APIView):
    permission_classes = [IsPayrollManager]

    def get(self, request):
        if request.user.is_super_admin:
            return Response({"detail": "Use the super admin dashboard."}, status=status.HTTP_403_FORBIDDEN)

        from apps.payroll.models import Payroll, Payslip
        from apps.employees.models import Employee
        from datetime import date

        company = request.user.company
        today = timezone.now().date()

        total_employees = Employee.all_objects.filter(company=company, is_active=True).count()

        # Current month payroll
        current_payroll = Payroll.all_objects.filter(
            company=company, month=today.month, year=today.year
        ).first()

        payroll_status = current_payroll.status if current_payroll else "not_started"
        total_gross = float(current_payroll.total_gross or 0) if current_payroll else 0
        total_net = float(current_payroll.total_net or 0) if current_payroll else 0
        employees_processed = current_payroll.payslips.count() if current_payroll else 0

        # Recent payrolls (last 6 months)
        recent_payrolls = []
        for i in range(5, -1, -1):
            month = today.month - i
            year = today.year
            while month <= 0:
                month += 12
                year -= 1
            p = Payroll.all_objects.filter(company=company, month=month, year=year).first()
            import calendar
            recent_payrolls.append({
                "label": f"{calendar.month_abbr[month]} {year}",
                "month": month,
                "year": year,
                "status": p.status if p else "not_started",
                "net_total": float(p.total_net or 0) if p else 0,
            })

        return Response({
            "total_employees": total_employees,
            "employees_on_payroll": employees_processed,
            "current_month_status": payroll_status,
            "current_month_gross": total_gross,
            "current_month_net": total_net,
            "recent_payrolls": recent_payrolls,
        })


class RecruiterDashboardView(APIView):
    permission_classes = [IsRecruiter]

    def get(self, request):
        if request.user.is_super_admin:
            return Response({"detail": "Use the super admin dashboard."}, status=status.HTTP_403_FORBIDDEN)

        from apps.recruitment.models import JobPost, Candidate
        from apps.employees.models import Employee

        company = request.user.company
        today = timezone.now().date()

        open_positions = JobPost.all_objects.filter(company=company, status="open").count()
        closed_positions = JobPost.all_objects.filter(company=company, status="closed").count()
        total_candidates = Candidate.all_objects.filter(company=company).count()

        active_stages = ["applied", "screening", "interview", "offer"]
        in_pipeline = Candidate.all_objects.filter(company=company, stage__in=active_stages).count()
        hired = Candidate.all_objects.filter(company=company, stage="hired").count()
        rejected = Candidate.all_objects.filter(company=company, stage="rejected").count()

        # Pipeline by stage
        pipeline_by_stage = []
        for stage in active_stages:
            count = Candidate.all_objects.filter(company=company, stage=stage).count()
            pipeline_by_stage.append({"stage": stage.title(), "count": count})

        # Recent job posts
        recent_jobs = []
        for job in JobPost.all_objects.filter(company=company).order_by("-created_at")[:5]:
            candidates_count = Candidate.all_objects.filter(company=company, job_post=job).count()
            recent_jobs.append({
                "id": job.id,
                "title": job.title,
                "status": job.status,
                "candidates": candidates_count,
                "posted_on": job.created_at.date().isoformat(),
            })

        return Response({
            "open_positions": open_positions,
            "closed_positions": closed_positions,
            "total_candidates": total_candidates,
            "in_pipeline": in_pipeline,
            "hired_total": hired,
            "rejected_total": rejected,
            "pipeline_by_stage": pipeline_by_stage,
            "recent_jobs": recent_jobs,
        })


class ManagerDashboardView(APIView):
    permission_classes = [IsTeamLead]

    def get(self, request):
        if request.user.is_super_admin:
            return Response({"detail": "Use the super admin dashboard."}, status=status.HTTP_403_FORBIDDEN)

        from apps.employees.models import Employee, Team
        from apps.attendance.models import Attendance
        from apps.leaves.models import LeaveRequest
        from apps.performance.models import PerformanceReview
        from datetime import timedelta

        company = request.user.company
        today = timezone.now().date()

        # Managed teams
        is_manager = request.user.has_role("manager")
        if is_manager:
            teams = Team.all_objects.filter(company=company, lead__user=request.user)
        else:
            teams = Team.all_objects.filter(company=company, lead__user=request.user)

        team_ids = list(teams.values_list("id", flat=True))
        team_members = Employee.all_objects.filter(company=company, team_id__in=team_ids, is_active=True)
        member_count = team_members.count()
        member_ids = list(team_members.values_list("id", flat=True))

        # Attendance today
        attendance_today = Attendance.all_objects.filter(
            company=company, employee_id__in=member_ids, date=today
        )

        # Pending leave requests from team
        pending_leaves = LeaveRequest.all_objects.filter(
            company=company, employee_id__in=member_ids, status="pending"
        ).count()

        # Weekly team attendance trend
        week_trend = []
        for i in range(4, -1, -1):
            d = today - timedelta(days=i)
            day_qs = Attendance.all_objects.filter(company=company, employee_id__in=member_ids, date=d)
            week_trend.append({
                "day": d.strftime("%a"),
                "present": day_qs.filter(status__in=["present", "wfh"]).count(),
                "absent": day_qs.filter(status="absent").count(),
                "leave": day_qs.filter(status="leave").count(),
            })

        return Response({
            "team_count": teams.count(),
            "team_member_count": member_count,
            "present_today": attendance_today.filter(status__in=["present", "wfh"]).count(),
            "absent_today": attendance_today.filter(status="absent").count(),
            "on_leave_today": attendance_today.filter(status="leave").count(),
            "pending_leave_requests": pending_leaves,
            "attendance_trend": week_trend,
        })


class TeamLeadDashboardView(APIView):
    permission_classes = [IsTeamLead]

    def get(self, request):
        if request.user.is_super_admin:
            return Response({"detail": "Use the super admin dashboard."}, status=status.HTTP_403_FORBIDDEN)

        from apps.employees.models import Employee, Team
        from apps.attendance.models import Attendance
        from apps.leaves.models import LeaveRequest

        company = request.user.company
        today = timezone.now().date()

        team = Team.all_objects.filter(company=company, lead__user=request.user).first()
        if not team:
            return Response({
                "team_name": None,
                "team_member_count": 0,
                "present_today": 0,
                "absent_today": 0,
                "on_leave_today": 0,
                "pending_leave_requests": 0,
                "members": [],
            })

        members = Employee.all_objects.filter(company=company, team=team, is_active=True)
        member_ids = list(members.values_list("id", flat=True))

        attendance_today = Attendance.all_objects.filter(
            company=company, employee_id__in=member_ids, date=today
        )
        att_map = {a.employee_id: a for a in attendance_today}

        members_data = []
        for m in members.select_related("designation"):
            att = att_map.get(m.id)
            members_data.append({
                "id": m.id,
                "name": m.full_name,
                "designation": m.designation.name if m.designation else None,
                "attendance_status": att.status if att else "absent",
                "check_in": att.check_in.strftime("%H:%M") if att and att.check_in else None,
            })

        pending_leaves = LeaveRequest.all_objects.filter(
            company=company, employee_id__in=member_ids, status="pending"
        ).count()

        return Response({
            "team_name": team.name,
            "team_member_count": members.count(),
            "present_today": attendance_today.filter(status__in=["present", "wfh"]).count(),
            "absent_today": attendance_today.filter(status="absent").count(),
            "on_leave_today": attendance_today.filter(status="leave").count(),
            "pending_leave_requests": pending_leaves,
            "members": members_data,
        })


class TeamCalendarView(APIView):
    """Return a role-scoped monthly calendar with attendance, leaves, holidays and weekly offs."""

    def get(self, request):
        from apps.attendance.models import Attendance
        from apps.leaves.models import Holiday, LeaveRequest
        from datetime import timedelta
        import calendar

        month_str = request.query_params.get("month")
        try:
            year, month = map(int, month_str.split("-"))
        except Exception:
            today = timezone.now().date()
            year, month = today.year, today.month

        employee = getattr(request.user, "employee_profile", None)
        if not employee and not (request.user.has_role("company_admin") or request.user.has_role("hr_admin")):
            return Response({"team_name": None, "members": [], "today_stats": {}})

        company_id = request.user.company_id
        company = request.user.company

        members = list(_scoped_employee_queryset(request.user).select_related("designation", "team", "team__lead")[:100])
        member_ids = [m.id for m in members]
        _, days_in_month = calendar.monthrange(year, month)
        month_start = timezone.datetime(year, month, 1).date()
        month_end = timezone.datetime(year, month, days_in_month).date()

        attendance_qs = Attendance.all_objects.filter(
            company_id=company_id,
            employee_id__in=member_ids,
            date__year=year,
            date__month=month,
        )

        att_map = {}
        for att in attendance_qs:
            att_map.setdefault(att.employee_id, {})[att.date.isoformat()] = {
                "status": att.status,
                "check_in": att.check_in.strftime("%H:%M") if att.check_in else None,
                "check_out": att.check_out.strftime("%H:%M") if att.check_out else None,
                "is_late": att.is_late,
                "is_remote": bool(att.check_in_location),
                "working_hours": float(att.working_hours or 0),
            }

        leaves_qs = LeaveRequest.all_objects.filter(
            company_id=company_id,
            employee_id__in=member_ids,
            status__in=[LeaveRequest.Status.PENDING, LeaveRequest.Status.MANAGER_APPROVED, LeaveRequest.Status.APPROVED],
            from_date__lte=month_end,
            to_date__gte=month_start,
        ).select_related("leave_type", "employee")
        leave_map = {}
        for leave in leaves_qs:
            start = max(leave.from_date, month_start)
            end = min(leave.to_date, month_end)
            cursor = start
            while cursor <= end:
                leave_map.setdefault(leave.employee_id, {}).setdefault(cursor.isoformat(), []).append({
                    "id": leave.id,
                    "status": leave.status,
                    "leave_type": leave.leave_type.name,
                    "leave_type_code": leave.leave_type.code,
                    "days": float(leave.total_days),
                })
                cursor += timedelta(days=1)

        holidays = list(
            Holiday.all_objects.filter(company_id=company_id, is_active=True, date__gte=month_start, date__lte=month_end)
            .values("id", "name", "date", "holiday_type", "department_id")
        )
        holiday_map = {item["date"].isoformat(): {**item, "date": item["date"].isoformat()} for item in holidays}
        weekly_offs = _weekly_off_indexes(company)

        calendar_days = []
        for day in range(1, days_in_month + 1):
            value = timezone.datetime(year, month, day).date()
            calendar_days.append({
                "date": value.isoformat(),
                "day": day,
                "weekday": value.weekday(),
                "is_weekly_off": value.weekday() in weekly_offs,
                "holiday": holiday_map.get(value.isoformat()),
            })

        today = timezone.now().date()
        today_str = today.isoformat()
        on_time, late, wfh, remote_clockins, on_leave, not_marked, off = 0, 0, 0, 0, 0, 0, []

        members_data = []
        for m in members:
            today_att = att_map.get(m.id, {}).get(today_str)
            today_leave = leave_map.get(m.id, {}).get(today_str, [])
            today_status = today_att["status"] if today_att else ("leave" if today_leave else "not_marked")
            if today_status == "present" and not today_att.get("is_late"):
                on_time += 1
            elif today_status == "wfh":
                wfh += 1
            elif today_status == "leave":
                on_leave += 1
            elif today_status == "not_marked":
                not_marked += 1
                off.append(m.full_name)
            if today_att and today_att.get("is_late"):
                late += 1
            if today_att and today_att.get("is_remote"):
                remote_clockins += 1

            members_data.append({
                "id": m.id,
                "name": m.full_name,
                "is_self": bool(employee and m.id == employee.id),
                "designation": m.designation.name if m.designation else None,
                "team": m.team.name if m.team else None,
                "photo": m.photo.url if m.photo and m.photo.name else None,
                "attendance": att_map.get(m.id, {}),
                "leaves": leave_map.get(m.id, {}),
            })

        team_names = sorted({m.team.name for m in members if m.team_id})
        return Response({
            "team_name": ", ".join(team_names[:2]) if team_names else "My Team",
            "team_lead": employee.team.lead.full_name if employee and employee.team and employee.team.lead else None,
            "month": month,
            "year": year,
            "calendar_days": calendar_days,
            "holidays": holidays,
            "weekly_off_days": weekly_offs,
            "members": members_data,
            "today_stats": {
                "on_time": on_time,
                "late": late,
                "wfh": wfh,
                "remote_clockins": remote_clockins,
                "on_leave": on_leave,
                "not_marked": not_marked,
                "team_available": max(0, len(members) - on_leave - not_marked),
                "team_total": len(members),
                "off_today": off,
                "all_in": len(off) == 0,
            },
        })
