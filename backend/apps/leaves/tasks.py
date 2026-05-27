from celery import shared_task
from django.utils import timezone


@shared_task(name="leaves.run_due_leave_credits")
def run_due_leave_credits(run_date=None, company_id=None, force=False):
    from apps.companies.models import Company
    from .services import run_due_leave_credits as run_engine

    company = Company.objects.filter(id=company_id).first() if company_id else None
    credit_date = timezone.datetime.fromisoformat(run_date).date() if run_date else timezone.localdate()
    logs = run_engine(run_date=credit_date, company=company, force=force)
    return {
        "date": credit_date.isoformat(),
        "logs_created": len(logs),
        "credited": sum(log.employees_credited for log in logs),
        "days": float(sum(log.total_days_credited for log in logs)),
    }
