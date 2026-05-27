from decimal import Decimal
import calendar
from datetime import timedelta

from django.db import transaction
from django.utils import timezone

from apps.employees.models import Employee
from .models import LeaveApproval, LeaveBalance, LeaveCreditLog, LeavePolicy, LeaveTransaction, ReportingManager


def notify(user, company, title, message, notification_type="info", leave_request=None):
    if not user:
        return
    from apps.notifications.models import Notification

    Notification.all_objects.create(
        company=company,
        recipient=user,
        title=title,
        message=message,
        notification_type=notification_type,
        action_url=f"/leaves?request={leave_request.id}" if leave_request else "/leaves",
        data={"leave_request_id": leave_request.id} if leave_request else None,
    )


def leave_days(from_date, to_date, day_type):
    days = Decimal((to_date - from_date).days + 1)
    return Decimal("0.5") if day_type == "half_day" else days


def last_day_of_month(value):
    return calendar.monthrange(value.year, value.month)[1]


def policy_due_on(policy, run_date):
    if policy.accrual_frequency == LeavePolicy.AccrualFrequency.MONTHLY:
        if policy.monthly_credit_timing == LeavePolicy.MonthlyCreditTiming.MONTH_END:
            return run_date.day == last_day_of_month(run_date)
        if policy.monthly_credit_timing == LeavePolicy.MonthlyCreditTiming.NEXT_MONTH_FIRST:
            return run_date.day == 1
        return run_date.day == min(policy.monthly_credit_day, last_day_of_month(run_date))
    if policy.accrual_frequency == LeavePolicy.AccrualFrequency.YEARLY:
        return run_date.month == policy.yearly_credit_month and run_date.day == policy.yearly_credit_day
    return False


def policy_period_key(policy, run_date):
    if policy.accrual_frequency == LeavePolicy.AccrualFrequency.MONTHLY:
        if policy.monthly_credit_timing == LeavePolicy.MonthlyCreditTiming.NEXT_MONTH_FIRST:
            year = run_date.year
            month = run_date.month - 1
            if month == 0:
                month = 12
                year -= 1
            return f"{year:04d}-{month:02d}"
        return f"{run_date.year:04d}-{run_date.month:02d}"
    return f"{run_date.year:04d}"


def transaction_expiry_date(policy, run_date):
    if not policy.auto_expire_days:
        return None
    return run_date + timedelta(days=policy.auto_expire_days)


@transaction.atomic
def credit_leave_policy(policy, run_date=None, force=False):
    run_date = run_date or timezone.localdate()
    if not policy.is_active or policy.accrual_frequency == LeavePolicy.AccrualFrequency.MANUAL:
        return None
    if not policy_due_on(policy, run_date):
        return None

    period_key = policy_period_key(policy, run_date)
    existing = LeaveCreditLog.all_objects.filter(company=policy.company, policy=policy, period_key=period_key).first()
    if existing and not force:
        return existing

    employees = Employee.all_objects.filter(company=policy.company, is_active=True, status=Employee.Status.ACTIVE)
    processed = credited = skipped = 0
    total_credited = Decimal("0")
    messages = []

    for employee in employees.select_related("company"):
        processed += 1
        balance, _ = LeaveBalance.all_objects.get_or_create(
            company=policy.company,
            employee=employee,
            leave_type=policy.leave_type,
            year=run_date.year,
            defaults={
                "total_days": Decimal("0"),
                "carried_forward": Decimal("0"),
            },
        )
        credit_days = policy.credit_amount
        if credit_days <= 0:
            skipped += 1
            continue
        if policy.max_balance_days and balance.total_days + credit_days > policy.max_balance_days:
            credit_days = max(Decimal("0"), policy.max_balance_days - balance.total_days)
        if credit_days <= 0:
            skipped += 1
            messages.append(f"{employee.employee_id}: max balance reached")
            continue

        balance.total_days += credit_days
        balance.save(update_fields=["total_days", "updated_at"])
        LeaveTransaction.all_objects.create(
            company=policy.company,
            employee=employee,
            leave_type=policy.leave_type,
            leave_balance=balance,
            policy=policy,
            transaction_type=LeaveTransaction.TransactionType.CREDIT,
            days=credit_days,
            balance_after=balance.available_days,
            effective_date=run_date,
            expires_on=transaction_expiry_date(policy, run_date),
            reference=f"{policy.accrual_frequency}:{period_key}",
            remarks=f"Auto credited by {policy.leave_type.code} policy",
        )
        credited += 1
        total_credited += credit_days

    log_defaults = {
        "leave_type": policy.leave_type,
        "credit_date": run_date,
        "employees_processed": processed,
        "employees_credited": credited,
        "employees_skipped": skipped,
        "total_days_credited": total_credited,
        "status": LeaveCreditLog.Status.SUCCESS if credited else LeaveCreditLog.Status.SKIPPED,
        "message": "; ".join(messages[:20]),
    }
    if existing and force:
        for field, value in log_defaults.items():
            setattr(existing, field, value)
        existing.save()
        return existing
    return LeaveCreditLog.all_objects.create(company=policy.company, policy=policy, period_key=period_key, **log_defaults)


def run_due_leave_credits(run_date=None, company=None, force=False):
    run_date = run_date or timezone.localdate()
    policies = LeavePolicy.all_objects.filter(is_active=True).select_related("company", "leave_type")
    if company:
        policies = policies.filter(company=company)
    logs = []
    for policy in policies:
        log = credit_leave_policy(policy, run_date=run_date, force=force)
        if log:
            logs.append(log)
    return logs


def get_hr_user(company):
    return (
        company.users.filter(roles__role__name="hr_admin", status="active").first()
        or company.users.filter(roles__role__name="company_admin", status="active").first()
    )


def reporting_chain(employee):
    explicit_links = ReportingManager.all_objects.filter(
        company=employee.company, employee=employee, is_active=True
    ).select_related("manager", "manager__user")
    chain = [link.manager for link in explicit_links if link.manager_id]
    if chain:
        return chain

    seen = {employee.id}
    manager = employee.reporting_manager or (employee.team.reporting_manager if employee.team_id else None) or (
        employee.team.lead if employee.team_id else None
    )
    while manager and manager.id not in seen:
        chain.append(manager)
        seen.add(manager.id)
        manager = manager.reporting_manager
    return chain


@transaction.atomic
def create_approval_workflow(leave_request):
    LeaveApproval.all_objects.filter(leave_request=leave_request).delete()
    company = leave_request.company
    approvals = []
    level = 1

    for manager in reporting_chain(leave_request.employee):
        if manager.user_id:
            approvals.append(
                LeaveApproval(
                    company=company,
                    leave_request=leave_request,
                    approver=manager.user,
                    approver_employee=manager,
                    role="manager" if level > 1 else "reporting_manager",
                    level=level,
                )
            )
            level += 1

    hr_user = get_hr_user(company)
    needs_hr = leave_request.leave_type.requires_hr_approval or not approvals
    if needs_hr and hr_user and all(item.approver_id != hr_user.id for item in approvals):
        approvals.append(
            LeaveApproval(
                company=company,
                leave_request=leave_request,
                approver=hr_user,
                role="hr_admin",
                level=level,
            )
        )

    if approvals:
        LeaveApproval.all_objects.bulk_create(approvals)
        leave_request.current_approval_level = approvals[0].level
        leave_request.save(update_fields=["current_approval_level", "updated_at"])
        notify(
            approvals[0].approver,
            company,
            "Leave approval pending",
            f"{leave_request.employee.full_name} requested {leave_request.total_days} day(s) of {leave_request.leave_type.name}.",
            "info",
            leave_request,
        )


def sync_pending_balance(leave_request, previous_days=Decimal("0")):
    balance, _ = LeaveBalance.all_objects.get_or_create(
        company=leave_request.company,
        employee=leave_request.employee,
        leave_type=leave_request.leave_type,
        year=leave_request.from_date.year,
        defaults={
            "total_days": leave_request.leave_type.days_per_year,
            "carried_forward": Decimal("0"),
        },
    )
    balance.pending_days = max(Decimal("0"), balance.pending_days - previous_days + leave_request.total_days)
    balance.save(update_fields=["pending_days", "updated_at"])
    return balance


@transaction.atomic
def cancel_leave(leave_request, user):
    if leave_request.status not in ["pending", "manager_approved", "escalated"]:
        raise ValueError("Only pending workflow requests can be cancelled.")
    balance = LeaveBalance.all_objects.filter(
        company=leave_request.company,
        employee=leave_request.employee,
        leave_type=leave_request.leave_type,
        year=leave_request.from_date.year,
    ).first()
    if balance:
        balance.pending_days = max(Decimal("0"), balance.pending_days - leave_request.total_days)
        balance.save(update_fields=["pending_days", "updated_at"])
    leave_request.status = "cancelled"
    leave_request.reviewed_by = user
    leave_request.reviewed_at = timezone.now()
    leave_request.final_decision_at = timezone.now()
    leave_request.save(update_fields=["status", "reviewed_by", "reviewed_at", "final_decision_at", "updated_at"])
    for approval in leave_request.approvals.filter(status=LeaveApproval.Status.PENDING).select_related("approver"):
        notify(
            approval.approver,
            leave_request.company,
            "Leave request cancelled",
            f"{leave_request.employee.full_name} cancelled a pending leave request.",
            "warning",
            leave_request,
        )


@transaction.atomic
def act_on_approval(leave_request, user, action, comment=""):
    approval = leave_request.approvals.select_for_update().filter(
        level=leave_request.current_approval_level, status=LeaveApproval.Status.PENDING
    ).first()
    if not approval:
        raise ValueError("No pending approval step is available.")

    is_direct_approver = approval.approver_id == user.id
    is_admin = user.is_super_admin or user.has_role("company_admin") or user.has_role("hr_admin")
    if not (is_direct_approver or is_admin):
        raise PermissionError("You are not the approver for this step.")

    now = timezone.now()
    approval.comment = comment
    approval.acted_at = now

    if action == "escalate":
        hr_user = get_hr_user(leave_request.company)
        if not hr_user:
            raise ValueError("No HR admin is available for escalation.")
        approval.status = LeaveApproval.Status.ESCALATED
        approval.save(update_fields=["status", "comment", "acted_at", "updated_at"])
        next_level = approval.level + 1
        while LeaveApproval.all_objects.filter(leave_request=leave_request, level=next_level).exists():
            next_level += 1
        LeaveApproval.all_objects.create(
            company=leave_request.company,
            leave_request=leave_request,
            approver=hr_user,
            role="hr_admin",
            level=next_level,
        )
        leave_request.status = "escalated"
        leave_request.current_approval_level = next_level
        leave_request.save(update_fields=["status", "current_approval_level", "updated_at"])
        notify(
            hr_user,
            leave_request.company,
            "Leave request escalated",
            f"{leave_request.employee.full_name}'s leave request was escalated for HR review.",
            "warning",
            leave_request,
        )
        return leave_request

    if action == "reject":
        approval.status = LeaveApproval.Status.REJECTED
        approval.save(update_fields=["status", "comment", "acted_at", "updated_at"])
        balance = LeaveBalance.all_objects.filter(
            company=leave_request.company,
            employee=leave_request.employee,
            leave_type=leave_request.leave_type,
            year=leave_request.from_date.year,
        ).first()
        if balance:
            balance.pending_days = max(Decimal("0"), balance.pending_days - leave_request.total_days)
            balance.save(update_fields=["pending_days", "updated_at"])
        leave_request.status = "rejected"
        leave_request.reviewed_by = user
        leave_request.reviewed_at = now
        leave_request.review_comment = comment
        leave_request.final_decision_at = now
        leave_request.save()
        notify(
            leave_request.employee.user,
            leave_request.company,
            "Leave request rejected",
            f"Your {leave_request.leave_type.name} request was rejected.",
            "error",
            leave_request,
        )
        return leave_request

    approval.status = LeaveApproval.Status.APPROVED
    approval.save(update_fields=["status", "comment", "acted_at", "updated_at"])
    next_approval = leave_request.approvals.filter(status=LeaveApproval.Status.PENDING).order_by("level").first()
    if next_approval:
        leave_request.status = "manager_approved"
        leave_request.current_approval_level = next_approval.level
        leave_request.reviewed_by = user
        leave_request.reviewed_at = now
        leave_request.review_comment = comment
        leave_request.save()
        notify(
            next_approval.approver,
            leave_request.company,
            "Leave approval pending",
            f"{leave_request.employee.full_name}'s leave request needs your approval.",
            "info",
            leave_request,
        )
        return leave_request

    balance, _ = LeaveBalance.all_objects.get_or_create(
        company=leave_request.company,
        employee=leave_request.employee,
        leave_type=leave_request.leave_type,
        year=leave_request.from_date.year,
        defaults={"total_days": leave_request.leave_type.days_per_year},
    )
    balance.pending_days = max(Decimal("0"), balance.pending_days - leave_request.total_days)
    balance.used_days += leave_request.total_days
    balance.save(update_fields=["pending_days", "used_days", "updated_at"])
    LeaveTransaction.all_objects.create(
        company=leave_request.company,
        employee=leave_request.employee,
        leave_type=leave_request.leave_type,
        leave_balance=balance,
        transaction_type=LeaveTransaction.TransactionType.DEBIT,
        days=leave_request.total_days,
        balance_after=balance.available_days,
        effective_date=timezone.localdate(),
        reference=f"leave_request:{leave_request.id}",
        remarks="Leave approved and deducted",
    )
    leave_request.status = "approved"
    leave_request.reviewed_by = user
    leave_request.reviewed_at = now
    leave_request.review_comment = comment
    leave_request.final_decision_at = now
    leave_request.save()
    notify(
        leave_request.employee.user,
        leave_request.company,
        "Leave request approved",
        f"Your {leave_request.leave_type.name} request was approved.",
        "success",
        leave_request,
    )
    return leave_request
