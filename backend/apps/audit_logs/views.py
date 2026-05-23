from rest_framework import generics, filters
from django_filters.rest_framework import DjangoFilterBackend

from apps.core.permissions import IsCompanyAdmin
from .models import ActivityLog, LoginLog
from .serializers import ActivityLogSerializer, LoginLogSerializer


class ActivityLogListView(generics.ListAPIView):
    serializer_class = ActivityLogSerializer
    permission_classes = [IsCompanyAdmin]
    queryset = ActivityLog.objects.none()
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["action", "user"]
    search_fields = ["model_name", "description"]
    ordering_fields = ["created_at"]

    def get_queryset(self):
        if self.request.user.is_super_admin:
            return ActivityLog.objects.all()
        return ActivityLog.objects.filter(company=self.request.user.company)


class LoginLogListView(generics.ListAPIView):
    serializer_class = LoginLogSerializer
    permission_classes = [IsCompanyAdmin]
    queryset = LoginLog.objects.none()
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ["status"]
    ordering_fields = ["created_at"]

    def get_queryset(self):
        if self.request.user.is_super_admin:
            return LoginLog.objects.all()
        return LoginLog.objects.filter(user__company=self.request.user.company)
