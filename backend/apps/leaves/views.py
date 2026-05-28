"""
Leave Management Views
──────────────────────
Endpoints:
  /leaves/                          LeaveRequest CRUD + review/cancel/dashboard/calendar/analytics
  /leaves/types/                    LeaveType CRUD (HR only)
  /leaves/balances/                 LeaveBalance read + allocate/encash
  /leaves/policies/                 LeavePolicy CRUD + ensure_defaults/run_credits
  /leaves/reporting-managers/       ReportingManager CRUD (HR only)
  /leaves/transactions/             LeaveTransaction read-only
  /leaves/credit-logs/              LeaveCreditLog read-only
  /leaves/holidays/                 Holiday CRUD (HR only)
"""
from decimal import Decimal

from django.db.models import Count, Q, Sum
from django.utils import timezone
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response

from apps.core.permissions import IsHRAdmin, IsManager
from apps.employees.models import Employee
from .models import (
    Holiday,
    LeaveApproval,
    LeaveBalance,
    LeaveCreditLog,
    LeavePolicy,
    LeaveRequest,
    LeaveTransaction,
    LeaveType,
    ReportingManager,
)
from .serializers import (
    HolidaySerializer,
    LeaveActionSerializer,
    LeaveBalanceSerializer,
    LeaveCreditLogSerializer,
    LeavePolicySerializer,
    LeaveRequestSerializer,
    LeaveTransactionSerializer,
    LeaveTypeSerializer,
    ReportingManagerSerializer,
)
from .services import (
    act_on_approval,
    cancel_leave,
    create_approval_workflow,
    get_leave_analytics,
    run_due_leave_credits,
    sync_pending_balance,
)


# ─── Role Helpers ──────────────────────────────────────────────────────────────

def _is_people_admin(user):
    return user.is_super_admin or user.has_role("company_admin") or user.has_role("hr_admin")


def _is_managerial(user):
    return _is_people_admin(user) or user.has_role("manager") or user.has_role("team_lead")


def _get_managed_employee_ids(user):
    """
    Return a set of employee IDs that this manager/team-lead oversees.
    Used for scoped leave queries.
    """
    employee = getattr(user, "employee_profile", None)
    if not employee:
        return set()
    ids = set()
    # Direct reportees
    ids.update(Employee.all_objects.filter(
        reporting_manager=employee, company=user.company, is_active=True
    ).values_list("id", flat=True))
    # Team members (as lead or team manager)
    ids.update(Employee.all_objects.filter(
        Q(team__lead=employee) | Q(team__reporting_manager=employee),
        company=user.company, is_active=True
    ).values_list("id", flat=True))
    return ids


# ─── LeaveType ──────────────────────────────────────────────────────────────────

class LeaveTypeViewSet(viewsets.ModelViewSet):
    serializer_class = LeaveTypeSerializer
    permission_classes = [IsHRAdmin]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["name", "code"]
    ordering_fields = ["name", "days_per_year"]

    def get_queryset(self):
        user = self.request.user
        if user.is_super_admin:
            company_id = self.request.query_params.get("company_id")
            qs = LeaveType.objects.all()
            return (qs.filter(company_id=company_id) if company_id else qs).order_by("name")
        return LeaveType.objects.filter(company=user.company).order_by("name")

    def perform_create(self, serializer):
        serializer.save(company=self.request.user.company)

    def get_permissions(self):
        # Allow employees to read leave types (for apply-leave form)
        if self.action in ("list", "retrieve"):
            from rest_framework.permissions import IsAuthenticated
            return [IsAuthenticated()]
        return super().get_permissions()


# ─── LeaveBalance ───────────────────────────────────────────────────────────────

class LeaveBalanceViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = LeaveBalanceSerializer

    def get_queryset(self):
        user = self.request.user
        if user.is_super_admin:
            company_id = self.request.query_params.get("company_id")
            qs = LeaveBalance.objects.all()
            return qs.filter(company_id=company_id) if company_id else qs
        qs = LeaveBalance.objects.filter(company=user.company)
        # Employees see only their own; managers see their team; HR sees all
        if not (user.has_role("hr_admin") or user.has_role("company_admin") or user.has_role("manager")):
            if user.has_role("team_lead"):
                emp = getattr(user, "employee_profile", None)
                if emp:
                    team_ids = _get_managed_employee_ids(user)
                    team_ids.add(emp.id)
                    qs = qs.filter(employee_id__in=team_ids)
                else:
                    qs = qs.filter(employee__user=user)
            else:
                qs = qs.filter(employee__user=user)
        employee_id = self.request.query_params.get("employee_id")
        year = self.request.query_params.get("year")
        if employee_id:
            qs = qs.filter(employee_id=employee_id)
        if year:
            qs = qs.filter(year=year)
        return qs.select_related("employee", "leave_type")

    @action(detail=False, methods=["post"], permission_classes=[IsHRAdmin])
    def allocate(self, request):
        year = int(request.data.get("year") or timezone.now().year)
        employee_ids = request.data.get("employee_ids") or []
        leave_type_ids = request.data.get("leave_type_ids") or []
        employees = Employee.all_objects.filter(company=request.user.company, is_active=True)
        if employee_ids:
            employees = employees.filter(id__in=employee_ids)
        leave_types = LeaveType.all_objects.filter(company=request.user.company, is_active=True)
        if leave_type_ids:
            leave_types = leave_types.filter(id__in=leave_type_ids)
        created = 0
        for employee in employees:
            for leave_type in leave_types:
                previous = LeaveBalance.all_objects.filter(
                    company=request.user.company, employee=employee,
                    leave_type=leave_type, year=year - 1,
                ).first()
                carry = Decimal("0")
                if previous and leave_type.is_carry_forwardable:
                    carry = min(previous.available_days, leave_type.max_carry_forward_days)
                _, was_created = LeaveBalance.all_objects.get_or_create(
                    company=request.user.company, employee=employee,
                    leave_type=leave_type, year=year,
                    defaults={"total_days": leave_type.days_per_year + carry, "carried_forward": carry},
                )
                created += int(was_created)
        return Response({"detail": f"{created} leave balance rows allocated.", "created": created})

    @action(detail=True, methods=["post"], permission_classes=[IsHRAdmin])
    def encash(self, request, pk=None):
        balance = self.get_object()
        days = Decimal(str(request.data.get("days") or "0"))
        if days <= 0:
            return Response({"detail": "Days must be greater than zero."}, status=status.HTTP_400_BAD_REQUEST)
        if not balance.leave_type.is_encashable:
            return Response({"detail": "This leave type is not encashable."}, status=status.HTTP_400_BAD_REQUEST)
        if days > balance.available_days:
            return Response({"detail": "Encashment exceeds available balance."}, status=status.HTTP_400_BAD_REQUEST)
        balance.encashed_days += days
        balance.total_days -= days
        balance.save(update_fields=["encashed_days", "total_days", "updated_at"])
        LeaveTransaction.all_objects.create(
            company=balance.company, employee=balance.employee,
            leave_type=balance.leave_type, leave_balance=balance,
            transaction_type=LeaveTransaction.TransactionType.ENCASH,
            days=days, balance_after=balance.available_days,
            effective_date=timezone.localdate(),
            reference=f"encash:{balance.id}:{timezone.now().timestamp()}",
            remarks=request.data.get("remarks", "Leave encashment"),
        )
        return Response(LeaveBalanceSerializer(balance).data)

    @action(detail=False, methods=["post"], permission_classes=[IsHRAdmin])
    def adjust(self, request):
        """Manual balance adjustment for HR."""
        employee_id = request.data.get("employee_id")
        leave_type_id = request.data.get("leave_type_id")
        days = Decimal(str(request.data.get("days") or "0"))
        year = int(request.data.get("year") or timezone.now().year)
        remarks = request.data.get("remarks", "Manual adjustment")
        if not employee_id or not leave_type_id:
            return Response({"detail": "employee_id and leave_type_id are required."}, status=status.HTTP_400_BAD_REQUEST)
        balance, _ = LeaveBalance.all_objects.get_or_create(
            company=request.user.company,
            employee_id=employee_id, leave_type_id=leave_type_id, year=year,
            defaults={"total_days": Decimal("0")},
        )
        balance.total_days += days
        balance.save(update_fields=["total_days", "updated_at"])
        LeaveTransaction.all_objects.create(
            company=request.user.company, employee_id=employee_id,
            leave_type_id=leave_type_id, leave_balance=balance,
            transaction_type=LeaveTransaction.TransactionType.ADJUSTMENT,
            days=days, balance_after=balance.available_days,
            effective_date=timezone.localdate(),
            reference=f"adj:{balance.id}:{timezone.now().timestamp()}",
            remarks=remarks,
        )
        return Response(LeaveBalanceSerializer(balance).data)


# ─── LeaveRequest ───────────────────────────────────────────────────────────────

class LeaveRequestViewSet(viewsets.ModelViewSet):
    serializer_class = LeaveRequestSerializer
    parser_classes = [JSONParser, MultiPartParser, FormParser]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["employee__first_name", "employee__last_name", "employee__employee_id", "reason"]
    ordering_fields = ["created_at", "from_date", "total_days", "status"]

    def get_queryset(self):
        user = self.request.user
        base_select = lambda qs: qs.select_related(
            "employee", "employee__department", "employee__team", "leave_type", "employee__company"
        ).prefetch_related("approvals", "approvals__approver_employee")

        if user.is_super_admin:
            company_id = self.request.query_params.get("company_id")
            qs = LeaveRequest.all_objects.all()
            if company_id:
                qs = qs.filter(company_id=company_id)
            qs = self._apply_filters(qs)
            return base_select(qs).order_by("-created_at")

        qs = LeaveRequest.all_objects.filter(company=user.company)
        qs = self._apply_filters(qs)
        scope = self.request.query_params.get("scope")

        if scope == "approvals":
            return base_select(qs.filter(
                approvals__approver=user,
                approvals__status=LeaveApproval.Status.PENDING,
            ).distinct())

        if scope == "team":
            # Team lead / manager sees team members' leaves
            if _is_managerial(user):
                employee = getattr(user, "employee_profile", None)
                if employee:
                    member_ids = _get_managed_employee_ids(user)
                    return base_select(qs.filter(employee_id__in=member_ids)).order_by("-created_at")
            return base_select(qs.filter(employee__user=user)).order_by("-created_at")

        if scope == "calendar":
            qs = qs.filter(status__in=["pending", "manager_approved", "approved"])
            if not _is_people_admin(user):
                employee = getattr(user, "employee_profile", None)
                if employee:
                    member_ids = _get_managed_employee_ids(user)
                    member_ids.add(employee.id)
                    qs = qs.filter(employee_id__in=member_ids)
                else:
                    qs = qs.filter(employee__user=user)
            return base_select(qs).order_by("from_date")

        # Default scope
        if _is_people_admin(user):
            return base_select(qs).order_by("-created_at")
        if _is_managerial(user):
            employee = getattr(user, "employee_profile", None)
            filters_q = Q(employee__user=user)
            if employee:
                member_ids = _get_managed_employee_ids(user)
                if member_ids:
                    filters_q |= Q(employee_id__in=member_ids)
                filters_q |= Q(approvals__approver=user)
            return base_select(qs.filter(filters_q)).distinct().order_by("-created_at")

        # Plain employee — own leaves only
        return base_select(qs.filter(employee__user=user)).order_by("-created_at")

    def _apply_filters(self, qs):
        status_filter = self.request.query_params.get("status")
        employee_id = self.request.query_params.get("employee_id")
        dept_id = self.request.query_params.get("department_id")
        leave_type_id = self.request.query_params.get("leave_type_id")
        from_date = self.request.query_params.get("from_date")
        to_date = self.request.query_params.get("to_date")
        if status_filter:
            qs = qs.filter(status=status_filter)
        if employee_id:
            qs = qs.filter(employee_id=employee_id)
        if dept_id:
            qs = qs.filter(employee__department_id=dept_id)
        if leave_type_id:
            qs = qs.filter(leave_type_id=leave_type_id)
        if from_date:
            qs = qs.filter(from_date__gte=from_date)
        if to_date:
            qs = qs.filter(to_date__lte=to_date)
        return qs

    def perform_create(self, serializer):
        employee = self.request.user.employee_profile
        if not employee:
            from rest_framework.exceptions import ValidationError
            raise ValidationError({"detail": "No employee profile linked to this user."})
        leave_type = serializer.validated_data["leave_type"]
        balance = LeaveBalance.all_objects.filter(
            company=self.request.user.company, employee=employee,
            leave_type=leave_type, year=serializer.validated_data["from_date"].year,
        ).first()
        available = balance.available_days if balance else leave_type.days_per_year
        requested = serializer.validated_data["total_days"]
        allowed_floor = -leave_type.max_negative_days if leave_type.allow_negative_balance else Decimal("0")
        if available - requested < allowed_floor:
            from rest_framework.exceptions import ValidationError
            raise ValidationError({"detail": "Insufficient leave balance for this policy."})
        leave = serializer.save(company=self.request.user.company, employee=employee)
        sync_pending_balance(leave)
        create_approval_workflow(leave)

    # ── Actions ──────────────────────────────────────────────────────────────

    @action(detail=True, methods=["post"], permission_classes=[IsManager])
    def review(self, request, pk=None):
        """Approve / reject / escalate a leave request."""
        leave = self.get_object()
        serializer = LeaveActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            leave = act_on_approval(
                leave, request.user,
                serializer.validated_data["action"],
                serializer.validated_data.get("comment", ""),
            )
        except PermissionError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_403_FORBIDDEN)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(LeaveRequestSerializer(leave, context={"request": request}).data)

    @action(detail=True, methods=["post"])
    def cancel(self, request, pk=None):
        leave = self.get_object()
        if leave.employee.user_id != request.user.id and not _is_people_admin(request.user):
            return Response({"detail": "You can cancel only your own leave requests."}, status=status.HTTP_403_FORBIDDEN)
        try:
            cancel_leave(leave, request.user)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response({"detail": "Leave request cancelled."})

    @action(detail=False, methods=["get"])
    def dashboard(self, request):
        """Summary stats for the current user."""
        qs = self.get_queryset()
        user = request.user
        balances = LeaveBalance.all_objects.filter(company=user.company)
        if not _is_managerial(user):
            balances = balances.filter(employee__user=user)
        elif not _is_people_admin(user):
            emp = getattr(user, "employee_profile", None)
            if emp:
                member_ids = _get_managed_employee_ids(user)
                member_ids.add(emp.id)
                balances = balances.filter(employee_id__in=member_ids)

        status_counts = {row["status"]: row["count"] for row in qs.values("status").annotate(count=Count("id"))}
        total_available = sum((item.available_days for item in balances), Decimal("0"))
        pending_approvals = LeaveApproval.all_objects.filter(
            company=user.company,
            approver=user,
            status=LeaveApproval.Status.PENDING,
        ).count()
        return Response({
            "status_counts": status_counts,
            "pending_approvals": pending_approvals,
            "total_available": total_available,
            "on_leave_today": qs.filter(
                status="approved",
                from_date__lte=timezone.localdate(),
                to_date__gte=timezone.localdate(),
            ).count(),
        })

    @action(detail=False, methods=["get"])
    def my_approvals(self, request):
        """Returns leave requests where the current user has a pending approval task."""
        user = request.user
        qs = LeaveRequest.all_objects.filter(
            company=user.company,
            approvals__approver=user,
            approvals__status=LeaveApproval.Status.PENDING,
        ).select_related(
            "employee", "employee__department", "employee__team", "leave_type"
        ).prefetch_related("approvals", "approvals__approver_employee").distinct().order_by("-created_at")

        status_filter = request.query_params.get("status")
        if status_filter:
            qs = qs.filter(status=status_filter)
        return Response(LeaveRequestSerializer(qs[:200], many=True, context={"request": request}).data)

    @action(detail=False, methods=["get"])
    def team_leaves(self, request):
        """Team lead / manager: see all leaves for their team members."""
        user = request.user
        if not _is_managerial(user):
            return Response({"detail": "Access denied."}, status=status.HTTP_403_FORBIDDEN)
        employee = getattr(user, "employee_profile", None)
        if not employee and not _is_people_admin(user):
            return Response({"detail": "No employee profile found."}, status=status.HTTP_400_BAD_REQUEST)

        if _is_people_admin(user):
            # HR / admin: all leaves
            qs = LeaveRequest.all_objects.filter(company=user.company)
        else:
            member_ids = _get_managed_employee_ids(user)
            qs = LeaveRequest.all_objects.filter(company=user.company, employee_id__in=member_ids)

        qs = self._apply_filters(qs)
        qs = qs.select_related(
            "employee", "employee__department", "employee__team", "leave_type"
        ).prefetch_related("approvals").order_by("-created_at")
        return Response(LeaveRequestSerializer(qs[:500], many=True, context={"request": request}).data)

    @action(detail=False, methods=["get"])
    def analytics(self, request):
        """
        Role-based leave analytics.
        HR/Admin: company-wide. Manager/TL: team scope. Employee: own data.
        """
        user = request.user
        employee = getattr(user, "employee_profile", None)
        if _is_people_admin(user):
            data = get_leave_analytics(user.company)
        elif _is_managerial(user) and employee:
            data = get_leave_analytics(user.company, scope_employee=employee)
        else:
            # Employee: own leave summary
            year = timezone.now().year
            own_qs = LeaveRequest.all_objects.filter(company=user.company, employee__user=user, from_date__year=year)
            data = {
                "year": year,
                "status_counts": {r["status"]: r["count"] for r in own_qs.values("status").annotate(count=Count("id"))},
                "by_type": list(own_qs.values("leave_type__name").annotate(total=Count("id"), days=Sum("total_days"))),
                "by_department": [],
                "monthly_trend": list(own_qs.filter(status="approved").values("from_date__month").annotate(
                    count=Count("id"), days=Sum("total_days")).order_by("from_date__month")),
                "on_leave_now": own_qs.filter(
                    status="approved", from_date__lte=timezone.localdate(), to_date__gte=timezone.localdate()
                ).count(),
                "pending_count": own_qs.filter(status__in=["pending", "manager_approved", "escalated"]).count(),
                "total_requests": own_qs.count(),
            }
        return Response(data)

    @action(detail=False, methods=["get"])
    def calendar(self, request):
        start = request.query_params.get("start")
        end = request.query_params.get("end")
        leaves = self.get_queryset().filter(status__in=["pending", "manager_approved", "approved"])
        holidays = Holiday.all_objects.filter(company=request.user.company, is_active=True)
        if start:
            leaves = leaves.filter(to_date__gte=start)
            holidays = holidays.filter(date__gte=start)
        if end:
            leaves = leaves.filter(from_date__lte=end)
            holidays = holidays.filter(date__lte=end)
        return Response({
            "leaves": LeaveRequestSerializer(leaves[:500], many=True).data,
            "holidays": HolidaySerializer(holidays[:500], many=True).data,
        })


# ─── ReportingManager ───────────────────────────────────────────────────────────

class ReportingManagerViewSet(viewsets.ModelViewSet):
    serializer_class = ReportingManagerSerializer
    permission_classes = [IsHRAdmin]

    def get_queryset(self):
        user = self.request.user
        if user.is_super_admin:
            company_id = self.request.query_params.get("company_id")
            qs = ReportingManager.all_objects.all()
            return qs.filter(company_id=company_id) if company_id else qs.none()
        qs = ReportingManager.all_objects.filter(company=user.company).select_related("employee", "manager")
        employee_id = self.request.query_params.get("employee_id")
        if employee_id:
            qs = qs.filter(employee_id=employee_id)
        return qs

    def perform_create(self, serializer):
        serializer.save(company=self.request.user.company)


# ─── LeavePolicy ───────────────────────────────────────────────────────────────

class LeavePolicyViewSet(viewsets.ModelViewSet):
    serializer_class = LeavePolicySerializer
    permission_classes = [IsHRAdmin]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["leave_type__name", "leave_type__code"]
    ordering_fields = ["leave_type__name", "accrual_frequency", "credit_amount"]

    def get_queryset(self):
        user = self.request.user
        if user.is_super_admin:
            company_id = self.request.query_params.get("company_id")
            qs = LeavePolicy.all_objects.all()
            return qs.filter(company_id=company_id) if company_id else qs.none()
        return LeavePolicy.all_objects.filter(company=user.company).select_related("leave_type").order_by("leave_type__name")

    def perform_create(self, serializer):
        serializer.save(company=self.request.user.company)

    @action(detail=False, methods=["post"])
    def ensure_defaults(self, request):
        from decimal import Decimal
        defaults = [
            {"code": "EL", "name": "Earned Leave", "days": Decimal("12"),
             "frequency": LeavePolicy.AccrualFrequency.MONTHLY, "amount": Decimal("1"),
             "timing": LeavePolicy.MonthlyCreditTiming.MONTH_END},
            {"code": "CL", "name": "Casual Leave", "days": Decimal("12"),
             "frequency": LeavePolicy.AccrualFrequency.MONTHLY, "amount": Decimal("1"),
             "timing": LeavePolicy.MonthlyCreditTiming.MONTH_END},
            {"code": "SL", "name": "Sick Leave", "days": Decimal("8"),
             "frequency": LeavePolicy.AccrualFrequency.YEARLY, "amount": Decimal("8"),
             "timing": LeavePolicy.MonthlyCreditTiming.MONTH_END},
            {"code": "FL", "name": "Floater Leave", "days": Decimal("5"),
             "frequency": LeavePolicy.AccrualFrequency.YEARLY, "amount": Decimal("5"),
             "timing": LeavePolicy.MonthlyCreditTiming.MONTH_END},
        ]
        created = updated = 0
        for item in defaults:
            leave_type, _ = LeaveType.all_objects.update_or_create(
                company=request.user.company, code=item["code"],
                defaults={"name": item["name"], "days_per_year": item["days"],
                          "is_paid": True, "is_active": True, "is_carry_forwardable": True},
            )
            policy, was_created = LeavePolicy.all_objects.update_or_create(
                company=request.user.company, leave_type=leave_type,
                defaults={
                    "accrual_frequency": item["frequency"],
                    "credit_amount": item["amount"],
                    "monthly_credit_timing": item["timing"],
                    "yearly_credit_month": 1, "yearly_credit_day": 5,
                    "is_carry_forward_enabled": True,
                    "max_carry_forward_days": item["days"],
                    "max_balance_days": Decimal("0"), "is_active": True,
                },
            )
            created += int(was_created)
            updated += int(not was_created and policy.id)
        return Response({"detail": "Default EL, CL, SL and FL policies are ready.", "created": created, "updated": updated})

    @action(detail=False, methods=["post"])
    def run_credits(self, request):
        run_date_raw = request.data.get("credit_date")
        force = bool(request.data.get("force", False))
        run_date = timezone.datetime.fromisoformat(run_date_raw).date() if run_date_raw else timezone.localdate()
        logs = run_due_leave_credits(run_date=run_date, company=request.user.company, force=force)
        return Response({
            "detail": f"{len(logs)} policy credit run(s) completed.",
            "logs": LeaveCreditLogSerializer(logs, many=True).data,
        })


# ─── LeaveTransaction ───────────────────────────────────────────────────────────

class LeaveTransactionViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = LeaveTransactionSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["employee__first_name", "employee__last_name", "employee__employee_id",
                     "leave_type__name", "reference"]
    ordering_fields = ["effective_date", "days", "created_at"]

    def get_queryset(self):
        user = self.request.user
        if user.is_super_admin:
            company_id = self.request.query_params.get("company_id")
            qs = LeaveTransaction.all_objects.all()
            return qs.filter(company_id=company_id) if company_id else qs.none()
        qs = LeaveTransaction.all_objects.filter(company=user.company)
        if not _is_managerial(user):
            qs = qs.filter(employee__user=user)
        employee_id = self.request.query_params.get("employee_id")
        leave_type_id = self.request.query_params.get("leave_type_id")
        if employee_id:
            qs = qs.filter(employee_id=employee_id)
        if leave_type_id:
            qs = qs.filter(leave_type_id=leave_type_id)
        return qs.select_related("employee", "leave_type", "policy")


# ─── LeaveCreditLog ────────────────────────────────────────────────────────────

class LeaveCreditLogViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = LeaveCreditLogSerializer
    permission_classes = [IsHRAdmin]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["leave_type__name", "leave_type__code", "period_key", "message"]
    ordering_fields = ["credit_date", "employees_credited", "total_days_credited"]

    def get_queryset(self):
        user = self.request.user
        if user.is_super_admin:
            company_id = self.request.query_params.get("company_id")
            qs = LeaveCreditLog.all_objects.all()
            return qs.filter(company_id=company_id) if company_id else qs.none()
        return LeaveCreditLog.all_objects.filter(company=user.company).select_related("policy", "leave_type")


# ─── Holiday ───────────────────────────────────────────────────────────────────

class HolidayViewSet(viewsets.ModelViewSet):
    serializer_class = HolidaySerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["name", "holiday_type"]
    ordering_fields = ["date", "name"]

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            from rest_framework.permissions import IsAuthenticated
            return [IsAuthenticated()]
        return [IsHRAdmin()]

    def get_queryset(self):
        user = self.request.user
        if user.is_super_admin:
            company_id = self.request.query_params.get("company_id")
            qs = Holiday.all_objects.all()
            return qs.filter(company_id=company_id) if company_id else qs.none()
        qs = Holiday.all_objects.filter(company=user.company)
        department_id = self.request.query_params.get("department_id")
        if department_id:
            qs = qs.filter(Q(department_id=department_id) | Q(department__isnull=True))
        year = self.request.query_params.get("year")
        if year:
            qs = qs.filter(date__year=year)
        return qs

    def perform_create(self, serializer):
        serializer.save(company=self.request.user.company)