from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Sum, Count, Q
from django.utils import timezone

from apps.core.permissions import IsCompanyAdmin, IsHRAdmin
from .models import Budget, Expense, ExpenseCategory
from .serializers import BudgetSerializer, ExpenseSerializer, ExpenseCategorySerializer


class ExpenseCategoryViewSet(viewsets.ModelViewSet):
    serializer_class = ExpenseCategorySerializer
    permission_classes = [IsHRAdmin]

    def get_queryset(self):
        user = self.request.user
        if user.is_super_admin:
            company_id = self.request.query_params.get("company_id")
            qs = ExpenseCategory.all_objects.all()
            return qs.filter(company_id=company_id) if company_id else qs
        return ExpenseCategory.all_objects.filter(company=user.company)

    def perform_create(self, serializer):
        serializer.save(company=self.request.user.company)


class BudgetViewSet(viewsets.ModelViewSet):
    serializer_class = BudgetSerializer
    permission_classes = [IsHRAdmin]
    filter_backends = [filters.SearchFilter]
    search_fields = ["name"]

    def get_queryset(self):
        user = self.request.user
        if user.is_super_admin:
            company_id = self.request.query_params.get("company_id")
            qs = Budget.all_objects.all()
            if company_id:
                qs = qs.filter(company_id=company_id)
            return qs.select_related("department")
        qs = Budget.all_objects.filter(company=user.company).select_related("department")
        year = self.request.query_params.get("year")
        if year:
            qs = qs.filter(fiscal_year=year)
        return qs

    def perform_create(self, serializer):
        serializer.save(company=self.request.user.company)


class ExpenseViewSet(viewsets.ModelViewSet):
    serializer_class = ExpenseSerializer
    permission_classes = [IsHRAdmin]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["title", "description"]
    ordering_fields = ["expense_date", "amount", "created_at"]

    def get_queryset(self):
        user = self.request.user
        if user.is_super_admin:
            company_id = self.request.query_params.get("company_id")
            qs = Expense.all_objects.all()
            if company_id:
                qs = qs.filter(company_id=company_id)
            return qs.select_related("category", "department", "submitted_by", "approved_by")
        qs = Expense.all_objects.filter(company=user.company).select_related(
            "category", "department", "submitted_by", "approved_by"
        )
        status_filter = self.request.query_params.get("status")
        if status_filter:
            qs = qs.filter(status=status_filter)
        category = self.request.query_params.get("category")
        if category:
            qs = qs.filter(category_id=category)
        return qs.order_by("-expense_date")

    def perform_create(self, serializer):
        serializer.save(company=self.request.user.company, submitted_by=self.request.user)

    @action(detail=True, methods=["post"], permission_classes=[IsCompanyAdmin])
    def approve(self, request, pk=None):
        expense = self.get_object()
        expense.status = Expense.Status.APPROVED
        expense.approved_by = request.user
        expense.save()
        return Response({"detail": "Expense approved."})

    @action(detail=True, methods=["post"], permission_classes=[IsCompanyAdmin])
    def reject(self, request, pk=None):
        expense = self.get_object()
        expense.status = Expense.Status.REJECTED
        expense.approved_by = request.user
        expense.save()
        return Response({"detail": "Expense rejected."})

    @action(detail=False, methods=["get"])
    def summary(self, request):
        user = request.user
        if user.is_super_admin:
            company_id = request.query_params.get("company_id")
            qs = Expense.all_objects.filter(company_id=company_id) if company_id else Expense.all_objects.all()
        else:
            qs = Expense.all_objects.filter(company=user.company)

        year = request.query_params.get("year", timezone.now().year)
        qs = qs.filter(expense_date__year=year)

        total = qs.aggregate(total=Sum("amount"))["total"] or 0
        by_status = list(
            qs.values("status").annotate(total=Sum("amount"), count=Count("id"))
        )
        by_category = list(
            qs.values("category__name").annotate(total=Sum("amount")).order_by("-total")[:8]
        )
        monthly = []
        for m in range(1, 13):
            month_total = qs.filter(expense_date__month=m).aggregate(total=Sum("amount"))["total"] or 0
            import calendar
            monthly.append({"month": calendar.month_abbr[m], "amount": float(month_total)})

        return Response({
            "total": float(total),
            "by_status": by_status,
            "by_category": [{"name": x["category__name"] or "Uncategorized", "value": float(x["total"])} for x in by_category],
            "monthly": monthly,
        })
