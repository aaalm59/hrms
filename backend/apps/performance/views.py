from rest_framework import viewsets
from apps.core.permissions import IsManager, IsHRAdmin
from .models import AppraisalCycle, Goal, PerformanceReview
from .serializers import AppraisalCycleSerializer, GoalSerializer, PerformanceReviewSerializer


class AppraisalCycleViewSet(viewsets.ModelViewSet):
    serializer_class = AppraisalCycleSerializer
    permission_classes = [IsHRAdmin]

    def get_queryset(self):
        return AppraisalCycle.objects.filter(company=self.request.user.company)

    def perform_create(self, serializer):
        serializer.save(company=self.request.user.company)


class GoalViewSet(viewsets.ModelViewSet):
    serializer_class = GoalSerializer

    def get_queryset(self):
        user = self.request.user
        qs = Goal.objects.filter(company=user.company)
        if not (user.is_super_admin or user.has_role("hr_admin") or user.has_role("manager")):
            qs = qs.filter(employee__user=user)
        return qs

    def perform_create(self, serializer):
        serializer.save(company=self.request.user.company)


class PerformanceReviewViewSet(viewsets.ModelViewSet):
    serializer_class = PerformanceReviewSerializer
    permission_classes = [IsManager]

    def get_queryset(self):
        return PerformanceReview.objects.filter(company=self.request.user.company)

    def perform_create(self, serializer):
        serializer.save(company=self.request.user.company, reviewer=self.request.user)
