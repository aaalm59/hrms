from decimal import Decimal

from django.db.models import Count, Q
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
from .services import act_on_approval, cancel_leave, create_approval_workflow, run_due_leave_credits, sync_pending_balance


def _is_people_admin(user):
    return user.is_super_admin or user.has_role("company_admin") or user.has_role("hr_admin")


def _is_managerial(user):
    return _is_people_admin(user) or user.has_role("manager") or user.has_role("team_lead")


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
            qs = qs.filter(company_id=company_id) if company_id else qs
            return qs.order_by("name")
        return LeaveType.objects.filter(company=user.company).order_by("name")

    def perform_create(self, serializer):
        serializer.save(company=self.request.user.company)


class LeaveBalanceViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = LeaveBalanceSerializer

    def get_queryset(self):
        user = self.request.user
        if user.is_super_admin:
            company_id = self.request.query_params.get("company_id")
            qs = LeaveBalance.objects.all()
            return qs.filter(company_id=company_id) if company_id else qs
        qs = LeaveBalance.objects.filter(company=user.company)
        if not (user.has_role("hr_admin") or user.has_role("manager")):
            qs = qs.filter(employee__user=user)
        employee_id = self.request.query_params.get("employee_id")
        if employee_id:
            qs = qs.filter(employee_id=employee_id)
        return qs

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
                    company=request.user.company,
                    employee=employee,
                    leave_type=leave_type,
                    year=year - 1,
                ).first()
                carry = Decimal("0")
                if previous and leave_type.is_carry_forwardable:
                    carry = min(previous.available_days, leave_type.max_carry_forward_days)
                _, was_created = LeaveBalance.all_objects.get_or_create(
                    company=request.user.company,
                    employee=employee,
                    leave_type=leave_type,
                    year=year,
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
            company=balance.company,
            employee=balance.employee,
            leave_type=balance.leave_type,
            leave_balance=balance,
            transaction_type=LeaveTransaction.TransactionType.ENCASH,
            days=days,
            balance_after=balance.available_days,
            effective_date=timezone.localdate(),
            reference=f"encash:{balance.id}:{timezone.now().timestamp()}",
            remarks=request.data.get("remarks", "Leave encashment"),
        )
        return Response(LeaveBalanceSerializer(balance).data)


class LeaveRequestViewSet(viewsets.ModelViewSet):
    serializer_class = LeaveRequestSerializer
    parser_classes = [JSONParser, MultiPartParser, FormParser]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["employee__first_name", "employee__last_name", "employee__employee_id", "reason"]
    ordering_fields = ["created_at", "from_date", "total_days", "status"]

    def get_queryset(self):
        user = self.request.user
        if user.is_super_admin:
            company_id = self.request.query_params.get("company_id")
            status_filter = self.request.query_params.get("status")
            qs = LeaveRequest.all_objects.all().select_related("employee", "employee__department", "leave_type", "employee__company").prefetch_related("approvals")
            if company_id:
                qs = qs.filter(company_id=company_id)
            if status_filter:
                qs = qs.filter(status=status_filter)
            return qs.order_by("-created_at")

        qs = LeaveRequest.all_objects.filter(company=user.company).select_related(
            "employee", "employee__department", "leave_type"
        ).prefetch_related("approvals")
        status_filter = self.request.query_params.get("status")
        scope = self.request.query_params.get("scope")
        if status_filter:
            qs = qs.filter(status=status_filter)
        if scope == "approvals":
            return qs.filter(approvals__approver=user).distinct()
        if scope == "calendar":
            return qs.filter(status__in=[LeaveRequest.Status.PENDING, LeaveRequest.Status.MANAGER_APPROVED, LeaveRequest.Status.APPROVED])
        if _is_people_admin(user):
            return qs
        if _is_managerial(user):
            employee = getattr(user, "employee_profile", None)
            filters_q = Q(employee__user=user) | Q(approvals__approver=user)
            if employee:
                filters_q |= Q(employee__reporting_manager=employee) | Q(employee__team__lead=employee) | Q(employee__team__reporting_manager=employee)
            return qs.filter(filters_q).distinct()
        else:
            qs = qs.filter(employee__user=user)
        return qs

    def perform_create(self, serializer):
        employee = self.request.user.employee_profile
        leave_type = serializer.validated_data["leave_type"]
        balance = LeaveBalance.all_objects.filter(
            company=self.request.user.company,
            employee=employee,
            leave_type=leave_type,
            year=serializer.validated_data["from_date"].year,
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

    @action(detail=True, methods=["post"], permission_classes=[IsManager])
    def review(self, request, pk=None):
        leave = self.get_object()
        serializer = LeaveActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            leave = act_on_approval(
                leave,
                request.user,
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
        qs = self.get_queryset()
        balances = LeaveBalance.all_objects.filter(company=request.user.company)
        if not _is_managerial(request.user):
            balances = balances.filter(employee__user=request.user)
        status_counts = qs.values("status").annotate(count=Count("id"))
        total_available = sum((item.available_days for item in balances), Decimal("0"))
        return Response({
            "status_counts": {row["status"]: row["count"] for row in status_counts},
            "pending_approvals": LeaveApproval.all_objects.filter(
                company=request.user.company, approver=request.user, status=LeaveApproval.Status.PENDING
            ).count(),
            "total_available": total_available,
        })

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


class ReportingManagerViewSet(viewsets.ModelViewSet):
    serializer_class = ReportingManagerSerializer
    permission_classes = [IsHRAdmin]

    def get_queryset(self):
        user = self.request.user
        if user.is_super_admin:
            company_id = self.request.query_params.get("company_id")
            qs = ReportingManager.all_objects.all()
            return qs.filter(company_id=company_id) if company_id else qs.none()
        return ReportingManager.all_objects.filter(company=user.company).select_related("employee", "manager")

    def perform_create(self, serializer):
        serializer.save(company=self.request.user.company)


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
        defaults = [
            {
                "code": "EL",
                "name": "Earned Leave",
                "days": Decimal("12"),
                "frequency": LeavePolicy.AccrualFrequency.MONTHLY,
                "amount": Decimal("1"),
                "timing": LeavePolicy.MonthlyCreditTiming.MONTH_END,
            },
            {
                "code": "CL",
                "name": "Casual Leave",
                "days": Decimal("12"),
                "frequency": LeavePolicy.AccrualFrequency.MONTHLY,
                "amount": Decimal("1"),
                "timing": LeavePolicy.MonthlyCreditTiming.MONTH_END,
            },
            {
                "code": "FL",
                "name": "Floater Leave",
                "days": Decimal("5"),
                "frequency": LeavePolicy.AccrualFrequency.YEARLY,
                "amount": Decimal("5"),
                "timing": LeavePolicy.MonthlyCreditTiming.MONTH_END,
            },
        ]
        created = 0
        updated = 0
        for item in defaults:
            leave_type, _ = LeaveType.all_objects.update_or_create(
                company=request.user.company,
                code=item["code"],
                defaults={
                    "name": item["name"],
                    "days_per_year": item["days"],
                    "is_paid": True,
                    "is_active": True,
                    "is_carry_forwardable": True,
                },
            )
            policy, was_created = LeavePolicy.all_objects.update_or_create(
                company=request.user.company,
                leave_type=leave_type,
                defaults={
                    "accrual_frequency": item["frequency"],
                    "credit_amount": item["amount"],
                    "monthly_credit_timing": item["timing"],
                    "yearly_credit_month": 1,
                    "yearly_credit_day": 5,
                    "is_carry_forward_enabled": True,
                    "max_carry_forward_days": item["days"],
                    "max_balance_days": Decimal("0"),
                    "is_active": True,
                },
            )
            created += int(was_created)
            updated += int(not was_created and policy.id)
        return Response({"detail": "Default EL, CL and FL policies are ready.", "created": created, "updated": updated})

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


class LeaveTransactionViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = LeaveTransactionSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["employee__first_name", "employee__last_name", "employee__employee_id", "leave_type__name", "reference"]
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


class HolidayViewSet(viewsets.ModelViewSet):
    serializer_class = HolidaySerializer
    permission_classes = [IsHRAdmin]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["name", "holiday_type"]
    ordering_fields = ["date", "name"]

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
        return qs

    def perform_create(self, serializer):
        serializer.save(company=self.request.user.company)
