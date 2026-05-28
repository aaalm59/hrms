import csv
import io
from datetime import date
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status as http_status
from django.http import HttpResponse
from django.db.models import Count, Sum, Q, Avg
from django.utils import timezone

from apps.core.permissions import IsHRAdmin


def _resolve_company(request):
    """
    Returns the Company for the current request.
    - Regular users  → their own company (from JWT)
    - Super Admin    → must pass ?company_id=<id> query param
    Returns (company, error_response) — error_response is None on success.
    """
    user = request.user
    if user.is_super_admin:
        company_id = request.query_params.get("company_id")
        if not company_id:
            return None, Response(
                {"detail": "Super admin must supply ?company_id= to scope this report."},
                status=http_status.HTTP_400_BAD_REQUEST,
            )
        from apps.companies.models import Company
        try:
            return Company.objects.get(pk=company_id, is_active=True), None
        except Company.DoesNotExist:
            return None, Response(
                {"detail": "Company not found."},
                status=http_status.HTTP_404_NOT_FOUND,
            )
    return user.company, None


class AttendanceReportView(APIView):
    permission_classes = [IsHRAdmin]

    def get(self, request):
        from apps.attendance.models import Attendance
        from apps.employees.models import Employee

        company, err = _resolve_company(request)
        if err:
            return err
        month = int(request.query_params.get("month", timezone.now().month))
        year = int(request.query_params.get("year", timezone.now().year))
        department_id = request.query_params.get("department")
        export = request.query_params.get("export")

        employees = Employee.all_objects.filter(company=company, is_active=True).select_related("department", "designation")
        if department_id:
            employees = employees.filter(department_id=department_id)

        rows = []
        for emp in employees:
            qs = Attendance.all_objects.filter(
                company=company, employee=emp, date__year=year, date__month=month
            )
            present = qs.filter(status="present").count()
            absent = qs.filter(status="absent").count()
            leave = qs.filter(status="leave").count()
            half_day = qs.filter(status="half_day").count()
            wfh = qs.filter(status="wfh").count()
            late = qs.filter(is_late=True).count() if hasattr(Attendance, 'is_late') else 0
            total_hours = qs.aggregate(total=Sum("working_hours"))["total"] or 0

            rows.append({
                "employee_id": emp.employee_id,
                "name": emp.full_name,
                "department": emp.department.name if emp.department else "—",
                "designation": emp.designation.name if emp.designation else "—",
                "present": present,
                "absent": absent,
                "leave": leave,
                "half_day": half_day,
                "wfh": wfh,
                "total_hours": round(float(total_hours), 1),
                "attendance_pct": round((present / 30) * 100, 1) if present else 0,
            })

        if export == "csv":
            output = io.StringIO()
            writer = csv.DictWriter(output, fieldnames=list(rows[0].keys()) if rows else [])
            writer.writeheader()
            writer.writerows(rows)
            response = HttpResponse(output.getvalue(), content_type="text/csv")
            response["Content-Disposition"] = f'attachment; filename="attendance_{year}_{month:02d}.csv"'
            return response

        return Response({
            "month": month,
            "year": year,
            "rows": rows,
            "summary": {
                "total_employees": len(rows),
                "avg_present": round(sum(r["present"] for r in rows) / len(rows), 1) if rows else 0,
                "avg_absent": round(sum(r["absent"] for r in rows) / len(rows), 1) if rows else 0,
            },
        })


class LeaveReportView(APIView):
    permission_classes = [IsHRAdmin]

    def get(self, request):
        from apps.leaves.models import LeaveRequest, LeaveBalance, LeaveType
        from apps.employees.models import Employee

        company, err = _resolve_company(request)
        if err:
            return err
        year = int(request.query_params.get("year", timezone.now().year))
        department_id = request.query_params.get("department")
        export = request.query_params.get("export")

        employees = Employee.all_objects.filter(company=company, is_active=True).select_related("department")
        if department_id:
            employees = employees.filter(department_id=department_id)

        leave_types = LeaveType.all_objects.filter(company=company)

        rows = []
        for emp in employees:
            row = {
                "employee_id": emp.employee_id,
                "name": emp.full_name,
                "department": emp.department.name if emp.department else "—",
            }
            total_used = 0
            for lt in leave_types:
                try:
                    bal = LeaveBalance.all_objects.get(company=company, employee=emp, leave_type=lt, year=year)
                    row[lt.name] = float(bal.used_days)
                    total_used += float(bal.used_days)
                except LeaveBalance.DoesNotExist:
                    row[lt.name] = 0
            row["total_used"] = total_used
            rows.append(row)

        # Summary by leave type
        type_summary = []
        for lt in leave_types:
            total = LeaveBalance.all_objects.filter(
                company=company, leave_type=lt, year=year
            ).aggregate(total=Sum("used_days"))["total"] or 0
            type_summary.append({"type": lt.name, "total_used": float(total)})

        if export == "csv" and rows:
            output = io.StringIO()
            writer = csv.DictWriter(output, fieldnames=list(rows[0].keys()))
            writer.writeheader()
            writer.writerows(rows)
            response = HttpResponse(output.getvalue(), content_type="text/csv")
            response["Content-Disposition"] = f'attachment; filename="leave_report_{year}.csv"'
            return response

        return Response({
            "year": year,
            "rows": rows,
            "type_summary": type_summary,
        })


class PayrollReportView(APIView):
    permission_classes = [IsHRAdmin]

    def get(self, request):
        from apps.payroll.models import Payroll, Payslip

        company, err = _resolve_company(request)
        if err:
            return err
        year = int(request.query_params.get("year", timezone.now().year))
        export = request.query_params.get("export")

        payrolls = Payroll.all_objects.filter(company=company, year=year).order_by("month")

        rows = []
        for pr in payrolls:
            rows.append({
                "month": pr.month,
                "month_name": date(year, pr.month, 1).strftime("%B"),
                "year": pr.year,
                "total_employees": pr.total_employees,
                "total_gross": float(pr.total_gross or 0),
                "total_deductions": float(pr.total_deductions or 0),
                "total_net": float(pr.total_net or 0),
                "status": pr.status,
            })

        ytd_gross = sum(r["total_gross"] for r in rows)
        ytd_net = sum(r["total_net"] for r in rows)
        ytd_deductions = sum(r["total_deductions"] for r in rows)

        if export == "csv" and rows:
            output = io.StringIO()
            writer = csv.DictWriter(output, fieldnames=list(rows[0].keys()))
            writer.writeheader()
            writer.writerows(rows)
            response = HttpResponse(output.getvalue(), content_type="text/csv")
            response["Content-Disposition"] = f'attachment; filename="payroll_report_{year}.csv"'
            return response

        return Response({
            "year": year,
            "rows": rows,
            "ytd": {
                "gross": ytd_gross,
                "net": ytd_net,
                "deductions": ytd_deductions,
            },
        })


class HeadcountReportView(APIView):
    permission_classes = [IsHRAdmin]

    def get(self, request):
        from apps.employees.models import Employee, Department

        company, err = _resolve_company(request)
        if err:
            return err
        today = timezone.now().date()

        by_dept = []
        for dept in Department.all_objects.filter(company=company):
            cnt = Employee.all_objects.filter(company=company, department=dept, is_active=True).count()
            by_dept.append({"department": dept.name, "count": cnt})

        by_type = list(
            Employee.all_objects.filter(company=company, is_active=True)
            .values("employment_type")
            .annotate(count=Count("id"))
        )

        by_status = list(
            Employee.all_objects.filter(company=company)
            .values("status")
            .annotate(count=Count("id"))
        )

        new_this_month = Employee.all_objects.filter(
            company=company,
            date_of_joining__year=today.year,
            date_of_joining__month=today.month,
        ).count()

        exited_this_month = Employee.all_objects.filter(
            company=company,
            date_of_leaving__year=today.year,
            date_of_leaving__month=today.month,
        ).count()

        return Response({
            "total_active": Employee.all_objects.filter(company=company, is_active=True).count(),
            "new_this_month": new_this_month,
            "exited_this_month": exited_this_month,
            "by_department": by_dept,
            "by_employment_type": [{"name": x["employment_type"].replace("_", " ").title(), "value": x["count"]} for x in by_type],
            "by_status": [{"name": x["status"].replace("_", " ").title(), "value": x["count"]} for x in by_status],
        })
