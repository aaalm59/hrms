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

        # Team data (employee sees only their own team)
        team_data = None
        if employee.team_id:
            from apps.employees.models import Team, Employee as EmpModel
            employee_with_team = EmpModel.all_objects.select_related(
                "team__lead"
            ).get(pk=employee.pk)
            team = employee_with_team.team
            # Explicit company_id filter — never use reverse FK manager
            team_members = list(
                EmpModel.all_objects.filter(
                    team=team, company_id=request.user.company_id, is_active=True
                ).select_related("designation")
            )
            member_ids = [m.id for m in team_members]

            att_map = {
                a.employee_id: a
                for a in Attendance.all_objects.filter(
                    company=request.user.company,
                    employee_id__in=member_ids,
                    date=today,
                )
            }

            members_data = []
            for member in team_members:
                att = att_map.get(member.id)
                members_data.append({
                    "id": member.id,
                    "name": member.full_name,
                    "is_self": member.id == employee.id,
                    "designation": member.designation.name if member.designation else None,
                    "attendance_status": att.status if att else "absent",
                    "check_in": att.check_in.strftime("%H:%M") if att and att.check_in else None,
                    "check_out": att.check_out.strftime("%H:%M") if att and att.check_out else None,
                })

            team_data = {
                "id": team.id,
                "name": team.name,
                "lead_name": team.lead.full_name if team.lead else None,
                "total_members": len(team_members),
                "members": members_data,
            }

        return Response({
            "checked_in_today": checked_in,
            "check_in_time": check_in_time,
            "working_hours_today": working_hours_today,
            "leave_balances": leave_balances,
            "pending_leave_requests": LeaveRequest.all_objects.filter(
                company=request.user.company, employee=employee, status="pending"
            ).count(),
            "recent_payslips": recent_payslips,
            "team": team_data,
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
    """Return monthly attendance for every member of the current user's team."""

    def get(self, request):
        from apps.employees.models import Employee, Team
        from apps.attendance.models import Attendance

        month_str = request.query_params.get("month")
        try:
            year, month = map(int, month_str.split("-"))
        except Exception:
            today = timezone.now().date()
            year, month = today.year, today.month

        employee = getattr(request.user, "employee_profile", None)
        if not employee or not employee.team_id:
            return Response({"team_name": None, "members": [], "today_stats": {}})

        team = employee.team
        company_id = request.user.company_id

        members = list(
            Employee.all_objects.filter(
                team=team, company_id=company_id, is_active=True
            ).select_related("designation")
        )
        member_ids = [m.id for m in members]

        attendance_qs = Attendance.all_objects.filter(
            company_id=company_id,
            employee_id__in=member_ids,
            date__year=year,
            date__month=month,
        )

        att_map = {}
        for att in attendance_qs:
            att_map.setdefault(att.employee_id, {})[att.date.isoformat()] = att.status

        today = timezone.now().date()
        today_str = today.isoformat()
        on_time, late, wfh, off = 0, 0, 0, []

        members_data = []
        for m in members:
            today_status = att_map.get(m.id, {}).get(today_str)
            if today_status == "present":
                on_time += 1
            elif today_status == "wfh":
                wfh += 1
            else:
                off.append(m.full_name)

            members_data.append({
                "id": m.id,
                "name": m.full_name,
                "is_self": m.id == employee.id,
                "designation": m.designation.name if m.designation else None,
                "photo": m.photo.url if m.photo and m.photo.name else None,
                "attendance": att_map.get(m.id, {}),
            })

        return Response({
            "team_name": team.name,
            "team_lead": team.lead.full_name if team.lead else None,
            "month": month,
            "year": year,
            "members": members_data,
            "today_stats": {
                "on_time": on_time,
                "late": late,
                "wfh": wfh,
                "off_today": off,
                "all_in": len(off) == 0,
            },
        })
