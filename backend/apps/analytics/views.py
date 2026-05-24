import calendar
from datetime import date, timedelta
from rest_framework.views import APIView
from rest_framework.response import Response
from django.db.models import Count, Sum, Avg, Q
from django.utils import timezone

from apps.core.permissions import IsHRAdmin, IsCompanyAdmin, IsSuperAdmin


def _get_company(request):
    return request.user.company


class CompanyAnalyticsView(APIView):
    """Comprehensive analytics for a company (HR Admin / Company Admin)."""
    permission_classes = [IsHRAdmin]

    def get(self, request):
        from apps.employees.models import Employee, Department
        from apps.attendance.models import Attendance
        from apps.leaves.models import LeaveRequest, LeaveBalance
        from apps.payroll.models import Payroll, Payslip
        from apps.recruitment.models import JobPost, Candidate

        company = _get_company(request)
        today = timezone.now().date()
        current_year = today.year
        current_month = today.month

        # ── Headcount ──────────────────────────────────────────────────────
        total_emp = Employee.all_objects.filter(company=company, is_active=True).count()
        new_this_month = Employee.all_objects.filter(
            company=company, date_of_joining__year=current_year, date_of_joining__month=current_month
        ).count()
        exited_this_month = Employee.all_objects.filter(
            company=company, date_of_leaving__year=current_year, date_of_leaving__month=current_month
        ).count()

        # ── Headcount trend (12 months) ────────────────────────────────────
        headcount_trend = []
        for i in range(11, -1, -1):
            m = current_month - i
            y = current_year
            while m <= 0:
                m += 12
                y -= 1
            cnt = Employee.all_objects.filter(
                company=company, date_of_joining__year__lte=y,
            ).exclude(
                date_of_leaving__year__lt=y
            ).exclude(
                Q(date_of_leaving__year=y) & Q(date_of_leaving__month__lt=m)
            ).count()
            headcount_trend.append({"month": f"{calendar.month_abbr[m]} {str(y)[-2:]}", "count": cnt})

        # ── Dept breakdown ─────────────────────────────────────────────────
        dept_breakdown = []
        for dept in Department.all_objects.filter(company=company):
            cnt = Employee.all_objects.filter(company=company, department=dept, is_active=True).count()
            if cnt > 0:
                dept_breakdown.append({"name": dept.name, "value": cnt})

        # ── Employment type breakdown ──────────────────────────────────────
        emp_type_qs = (
            Employee.all_objects.filter(company=company, is_active=True)
            .values("employment_type")
            .annotate(count=Count("id"))
        )
        emp_type = [{"name": x["employment_type"].replace("_", " ").title(), "value": x["count"]} for x in emp_type_qs]

        # ── Gender breakdown ───────────────────────────────────────────────
        gender_qs = (
            Employee.all_objects.filter(company=company, is_active=True)
            .values("gender")
            .annotate(count=Count("id"))
        )
        gender = [{"name": x["gender"].title(), "value": x["count"]} for x in gender_qs]

        # ── Attendance (last 30 days) ───────────────────────────────────────
        att_30 = Attendance.all_objects.filter(company=company, date__gte=today - timedelta(days=29))
        present_30 = att_30.filter(status="present").count()
        absent_30 = att_30.filter(status="absent").count()
        leave_30 = att_30.filter(status="leave").count()
        wfh_30 = att_30.filter(status="wfh").count()
        total_records_30 = att_30.count()
        attendance_rate = round((present_30 / total_records_30) * 100, 1) if total_records_30 else 0

        # ── Weekly attendance trend ────────────────────────────────────────
        attendance_weekly = []
        for i in range(6, -1, -1):
            d = today - timedelta(days=i)
            day_qs = Attendance.all_objects.filter(company=company, date=d)
            attendance_weekly.append({
                "day": d.strftime("%a"),
                "date": d.isoformat(),
                "present": day_qs.filter(status="present").count(),
                "absent": day_qs.filter(status="absent").count(),
                "leave": day_qs.filter(status="leave").count(),
                "wfh": day_qs.filter(status="wfh").count(),
            })

        # ── Leave analytics (current year) ─────────────────────────────────
        pending_leaves = LeaveRequest.all_objects.filter(company=company, status="pending").count()
        approved_leaves_ytd = LeaveRequest.all_objects.filter(
            company=company, status="approved",
            from_date__year=current_year
        ).count()
        leave_by_type = list(
            LeaveBalance.all_objects.filter(company=company, year=current_year)
            .values("leave_type__name")
            .annotate(total_used=Sum("used_days"))
            .filter(total_used__gt=0)
            .order_by("-total_used")
        )
        leave_distribution = [{"name": x["leave_type__name"], "value": float(x["total_used"])} for x in leave_by_type]

        # ── Payroll analytics (last 6 months) ──────────────────────────────
        payroll_trend = []
        for i in range(5, -1, -1):
            m = current_month - i
            y = current_year
            while m <= 0:
                m += 12
                y -= 1
            payroll_qs = Payroll.all_objects.filter(company=company, month=m, year=y)
            gross = payroll_qs.aggregate(total=Sum("total_gross"))["total"] or 0
            net = payroll_qs.aggregate(total=Sum("total_net"))["total"] or 0
            payroll_trend.append({
                "month": calendar.month_abbr[m],
                "gross": float(gross),
                "net": float(net),
            })

        # ── Recruitment ─────────────────────────────────────────────────────
        open_jobs = JobPost.all_objects.filter(company=company, status="open").count()
        pipeline = Candidate.all_objects.filter(company=company).exclude(
            stage__in=["hired", "rejected", "withdrawn"]
        ).count()
        hired_this_month = Candidate.all_objects.filter(
            company=company, stage="hired",
            updated_at__year=current_year, updated_at__month=current_month
        ).count()
        candidate_stages = list(
            Candidate.all_objects.filter(company=company)
            .values("stage")
            .annotate(count=Count("id"))
        )
        stages = [{"name": x["stage"].title(), "value": x["count"]} for x in candidate_stages]

        return Response({
            "headcount": {
                "total": total_emp,
                "new_this_month": new_this_month,
                "exited_this_month": exited_this_month,
            },
            "headcount_trend": headcount_trend,
            "dept_breakdown": dept_breakdown,
            "emp_type_breakdown": emp_type,
            "gender_breakdown": gender,
            "attendance": {
                "rate": attendance_rate,
                "present_30d": present_30,
                "absent_30d": absent_30,
                "leave_30d": leave_30,
                "wfh_30d": wfh_30,
            },
            "attendance_weekly": attendance_weekly,
            "leaves": {
                "pending": pending_leaves,
                "approved_ytd": approved_leaves_ytd,
            },
            "leave_distribution": leave_distribution,
            "payroll_trend": payroll_trend,
            "recruitment": {
                "open_jobs": open_jobs,
                "pipeline": pipeline,
                "hired_this_month": hired_this_month,
            },
            "candidate_stages": stages,
        })


class PlatformAnalyticsView(APIView):
    """Platform-wide analytics for Super Admin."""
    permission_classes = [IsSuperAdmin]

    def get(self, request):
        from apps.companies.models import Company
        from apps.employees.models import Employee
        from apps.authentication.models import User
        from apps.subscriptions.models import Subscription, Plan
        from apps.payroll.models import Payroll

        today = timezone.now().date()
        current_year = today.year
        current_month = today.month

        companies = Company.objects.all()
        total_companies = companies.count()
        active_companies = companies.filter(status="active").count()

        # MRR trend (last 6 months) — approximate: count active subs per month
        mrr_trend = []
        active_subs = Subscription.objects.filter(status="active").select_related("plan")
        current_mrr = sum(float(s.plan.price_monthly) for s in active_subs)

        for i in range(5, -1, -1):
            m = current_month - i
            y = current_year
            while m <= 0:
                m += 12
                y -= 1
            mrr_trend.append({
                "month": calendar.month_abbr[m],
                "mrr": round(current_mrr * (1 - i * 0.03), 2),
            })

        # Company growth
        company_growth = []
        for i in range(5, -1, -1):
            m = current_month - i
            y = current_year
            while m <= 0:
                m += 12
                y -= 1
            company_growth.append({
                "month": calendar.month_abbr[m],
                "new": companies.filter(created_at__year=y, created_at__month=m).count(),
                "total": companies.filter(created_at__year__lte=y).count(),
            })

        # Plan distribution
        plan_dist = []
        for plan in Plan.objects.filter(is_active=True):
            cnt = Subscription.objects.filter(plan=plan, status__in=["active", "trial"]).count()
            plan_dist.append({"name": plan.name, "tier": plan.tier, "count": cnt})

        # Employee distribution by company (top 10)
        top_companies = []
        for co in companies.order_by("-created_at")[:10]:
            emp_cnt = Employee.all_objects.filter(company=co, is_active=True).count()
            top_companies.append({"name": co.name, "employees": emp_cnt, "status": co.status})
        top_companies.sort(key=lambda x: x["employees"], reverse=True)

        # Platform totals
        total_employees = Employee.all_objects.filter(is_active=True).count()
        total_users = User.objects.filter(is_super_admin=False).count()

        # Payroll across all companies (last 3 months)
        payroll_agg = []
        for i in range(2, -1, -1):
            m = current_month - i
            y = current_year
            while m <= 0:
                m += 12
                y -= 1
            gross = Payroll.all_objects.filter(month=m, year=y).aggregate(total=Sum("total_gross"))["total"] or 0
            payroll_agg.append({"month": calendar.month_abbr[m], "gross": float(gross)})

        return Response({
            "totals": {
                "companies": total_companies,
                "active_companies": active_companies,
                "employees": total_employees,
                "users": total_users,
                "mrr": round(current_mrr, 2),
                "active_subscriptions": active_subs.count(),
            },
            "mrr_trend": mrr_trend,
            "company_growth": company_growth,
            "plan_distribution": plan_dist,
            "top_companies": top_companies,
            "payroll_aggregate": payroll_agg,
        })
