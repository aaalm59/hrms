from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone

from apps.core.permissions import IsHRAdmin, IsManager
from .models import Attendance, Shift, AttendanceRegularization
from .serializers import AttendanceSerializer, ShiftSerializer, CheckInSerializer, AttendanceRegularizationSerializer


class ShiftViewSet(viewsets.ModelViewSet):
    serializer_class = ShiftSerializer
    permission_classes = [IsHRAdmin]
    queryset = Shift.objects.none()

    def get_queryset(self):
        return Shift.objects.filter(company=self.request.user.company)

    def perform_create(self, serializer):
        serializer.save(company=self.request.user.company)


class AttendanceViewSet(viewsets.ModelViewSet):
    serializer_class = AttendanceSerializer
    permission_classes = [IsManager]
    queryset = Attendance.objects.none()

    def get_queryset(self):
        qs = Attendance.objects.filter(company=self.request.user.company).select_related("employee", "shift")
        date = self.request.query_params.get("date")
        employee_id = self.request.query_params.get("employee_id")
        if date:
            qs = qs.filter(date=date)
        if employee_id:
            qs = qs.filter(employee_id=employee_id)
        return qs

    def perform_create(self, serializer):
        serializer.save(company=self.request.user.company)

    @action(detail=False, methods=["post"])
    def check_in(self, request):
        serializer = CheckInSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        employee = request.user.employee_profile
        today = timezone.now().date()
        attendance, created = Attendance.objects.get_or_create(
            company=request.user.company,
            employee=employee,
            date=today,
            defaults={"status": Attendance.Status.PRESENT},
        )
        if not created and attendance.check_in:
            return Response({"detail": "Already checked in."}, status=status.HTTP_400_BAD_REQUEST)
        attendance.check_in = timezone.now()
        attendance.check_in_location = serializer.validated_data.get("location")
        attendance.status = Attendance.Status.PRESENT
        attendance.save()
        return Response({"detail": "Checked in successfully.", "time": attendance.check_in})

    @action(detail=False, methods=["post"])
    def check_out(self, request):
        employee = request.user.employee_profile
        today = timezone.now().date()
        try:
            attendance = Attendance.objects.get(company=request.user.company, employee=employee, date=today)
        except Attendance.DoesNotExist:
            return Response({"detail": "No check-in found for today."}, status=status.HTTP_400_BAD_REQUEST)
        attendance.check_out = timezone.now()
        if attendance.check_in:
            delta = attendance.check_out - attendance.check_in
            attendance.working_hours = round(delta.total_seconds() / 3600, 2)
        attendance.save()
        return Response({"detail": "Checked out.", "working_hours": attendance.working_hours})

    @action(detail=False, methods=["get"])
    def today_summary(self, request):
        today = timezone.now().date()
        qs = Attendance.objects.filter(company=request.user.company, date=today)
        return Response({
            "present": qs.filter(status=Attendance.Status.PRESENT).count(),
            "absent": qs.filter(status=Attendance.Status.ABSENT).count(),
            "on_leave": qs.filter(status=Attendance.Status.LEAVE).count(),
            "wfh": qs.filter(status=Attendance.Status.WORK_FROM_HOME).count(),
            "half_day": qs.filter(status=Attendance.Status.HALF_DAY).count(),
        })
