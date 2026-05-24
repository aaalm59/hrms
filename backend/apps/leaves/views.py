from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone

from apps.core.permissions import IsHRAdmin, IsManager
from .models import LeaveType, LeaveBalance, LeaveRequest
from .serializers import LeaveTypeSerializer, LeaveBalanceSerializer, LeaveRequestSerializer, LeaveApprovalSerializer


class LeaveTypeViewSet(viewsets.ModelViewSet):
    serializer_class = LeaveTypeSerializer
    permission_classes = [IsHRAdmin]

    def get_queryset(self):
        user = self.request.user
        if user.is_super_admin:
            company_id = self.request.query_params.get("company_id")
            qs = LeaveType.objects.all()
            return qs.filter(company_id=company_id) if company_id else qs
        return LeaveType.objects.filter(company=user.company)

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


class LeaveRequestViewSet(viewsets.ModelViewSet):
    serializer_class = LeaveRequestSerializer

    def get_queryset(self):
        user = self.request.user
        if user.is_super_admin:
            company_id = self.request.query_params.get("company_id")
            status_filter = self.request.query_params.get("status")
            qs = LeaveRequest.objects.all().select_related("employee", "leave_type", "employee__company")
            if company_id:
                qs = qs.filter(company_id=company_id)
            if status_filter:
                qs = qs.filter(status=status_filter)
            return qs.order_by("-created_at")
        qs = LeaveRequest.objects.filter(company=user.company).select_related("employee", "leave_type")
        if not (user.has_role("hr_admin") or user.has_role("manager")):
            qs = qs.filter(employee__user=user)
        return qs

    def perform_create(self, serializer):
        serializer.save(company=self.request.user.company, employee=self.request.user.employee_profile)

    @action(detail=True, methods=["post"], permission_classes=[IsManager])
    def review(self, request, pk=None):
        leave = self.get_object()
        serializer = LeaveApprovalSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        action_taken = serializer.validated_data["action"]
        leave.status = (
            LeaveRequest.Status.APPROVED if action_taken == "approve" else LeaveRequest.Status.REJECTED
        )
        leave.reviewed_by = request.user
        leave.reviewed_at = timezone.now()
        leave.review_comment = serializer.validated_data.get("comment", "")
        leave.save()
        return Response({"detail": f"Leave {leave.status}."})
