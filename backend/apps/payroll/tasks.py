from celery import shared_task
from django.utils import timezone


@shared_task(name="payroll.process_payroll")
def process_payroll(payroll_id: int):
    from .models import Payroll, Payslip, EmployeeSalary
    from apps.employees.models import Employee
    from apps.attendance.models import Attendance

    try:
        payroll = Payroll.objects.get(pk=payroll_id)
        employees = Employee.objects.filter(company=payroll.company, is_active=True)
        total_gross = total_deductions = total_net = 0

        for employee in employees:
            try:
                emp_salary = EmployeeSalary.objects.get(employee=employee, is_current=True)
            except EmployeeSalary.DoesNotExist:
                continue

            # Calculate paid days from attendance
            import calendar
            working_days = calendar.monthrange(payroll.year, payroll.month)[1]
            absent_days = Attendance.all_objects.filter(
                company=payroll.company,
                employee=employee,
                date__month=payroll.month,
                date__year=payroll.year,
                status=Attendance.Status.ABSENT,
            ).count()
            paid_days = working_days - absent_days

            # Basic salary calculation
            daily_rate = emp_salary.basic / working_days
            gross = float(daily_rate) * paid_days
            # Standard PF deduction: 12% of basic
            pf = float(emp_salary.basic) * 0.12
            net = gross - pf

            Payslip.objects.update_or_create(
                company=payroll.company,
                payroll=payroll,
                employee=employee,
                defaults={
                    "gross_salary": gross,
                    "total_deductions": pf,
                    "net_salary": net,
                    "working_days": working_days,
                    "paid_days": paid_days,
                    "lop_days": absent_days,
                    "earnings": {"basic": float(emp_salary.basic)},
                    "deductions": {"pf": pf},
                },
            )
            total_gross += gross
            total_deductions += pf
            total_net += net

        payroll.total_employees = employees.count()
        payroll.total_gross = total_gross
        payroll.total_deductions = total_deductions
        payroll.total_net = total_net
        payroll.status = Payroll.Status.PROCESSED
        payroll.processed_at = timezone.now()
        payroll.save()
    except Payroll.DoesNotExist:
        pass
