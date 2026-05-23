from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone

from apps.core.permissions import IsHRAdmin
from .models import Notification, Announcement
from .serializers import NotificationSerializer, AnnouncementSerializer


class NotificationViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = NotificationSerializer

    def get_queryset(self):
        return Notification.objects.filter(
            company=self.request.user.company,
            recipient=self.request.user,
        )

    @action(detail=True, methods=["post"])
    def mark_read(self, request, pk=None):
        notification = self.get_object()
        notification.is_read = True
        notification.read_at = timezone.now()
        notification.save()
        return Response({"detail": "Marked as read."})

    @action(detail=False, methods=["post"])
    def mark_all_read(self, request):
        self.get_queryset().filter(is_read=False).update(is_read=True, read_at=timezone.now())
        return Response({"detail": "All notifications marked as read."})

    @action(detail=False, methods=["get"])
    def unread_count(self, request):
        count = self.get_queryset().filter(is_read=False).count()
        return Response({"unread_count": count})


class AnnouncementViewSet(viewsets.ModelViewSet):
    serializer_class = AnnouncementSerializer

    def get_queryset(self):
        return Announcement.objects.filter(company=self.request.user.company)

    def get_permissions(self):
        if self.action in ["list", "retrieve"]:
            return super().get_permissions()
        return [IsHRAdmin()]

    def perform_create(self, serializer):
        serializer.save(company=self.request.user.company, created_by=self.request.user)
