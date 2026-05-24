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
        user = self.request.user
        if user.is_super_admin:
            company_id = self.request.query_params.get("company_id")
            qs = Attendance.objects.all().select_related("employee", "shift")
            if company_id:
                qs = qs.filter(company_id=company_id)
        else:
            qs = Attendance.objects.filter(company=user.company).select_related("employee", "shift")
        date = self.request.query_params.get("date")
        employee_id = self.request.query_params.get("employee_id") or self.request.query_params.get("employee")
        month = self.request.query_params.get("month")  # format: YYYY-MM
        if date:
            qs = qs.filter(date=date)
        if employee_id:
            qs = qs.filter(employee_id=employee_id)
        if month:
            try:
                year, mon = month.split("-")
                qs = qs.filter(date__year=int(year), date__month=int(mon))
            except (ValueError, AttributeError):
                pass
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

    @action(detail=False, methods=["post"])
    def regularize(self, request):
        """Submit attendance regularization request for a given date."""
        from datetime import datetime
        employee = request.user.employee_profile
        date_str = request.data.get("date")
        reason = request.data.get("reason", "")
        check_in_time = request.data.get("check_in_time")
        check_out_time = request.data.get("check_out_time")

        if not date_str or not reason:
            return Response({"detail": "date and reason are required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            from datetime import date as date_type
            att_date = datetime.strptime(date_str, "%Y-%m-%d").date()
        except ValueError:
            return Response({"detail": "Invalid date format."}, status=status.HTTP_400_BAD_REQUEST)

        attendance, _ = Attendance.objects.get_or_create(
            company=request.user.company,
            employee=employee,
            date=att_date,
            defaults={"status": Attendance.Status.ABSENT},
        )

        # Update requested times on the attendance record
        if check_in_time:
            try:
                t = datetime.strptime(check_in_time, "%H:%M").time()
                from datetime import datetime as dt, timezone as tz_module
                attendance.check_in = dt.combine(att_date, t).replace(tzinfo=timezone.get_current_timezone())
            except ValueError:
                pass
        if check_out_time:
            try:
                t = datetime.strptime(check_out_time, "%H:%M").time()
                attendance.check_out = dt.combine(att_date, t).replace(tzinfo=timezone.get_current_timezone())
            except ValueError:
                pass
        attendance.save()

        # Create or update regularization request
        reg, created = AttendanceRegularization.objects.update_or_create(
            company=request.user.company,
            attendance=attendance,
            defaults={"employee": employee, "reason": reason, "status": "pending"},
        )
        serializer = AttendanceRegularizationSerializer(reg)
        return Response(serializer.data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)


class AttendanceRegularizationViewSet(viewsets.ModelViewSet):
    serializer_class = AttendanceRegularizationSerializer
    permission_classes = [IsManager]

    def get_queryset(self):
        user = self.request.user
        qs = AttendanceRegularization.objects.filter(company=user.company).select_related("employee", "attendance")
        if not (user.is_super_admin or user.has_role("hr_admin") or user.has_role("manager")):
            qs = qs.filter(employee__user=user)
        return qs

    @action(detail=True, methods=["post"], permission_classes=[IsHRAdmin])
    def approve(self, request, pk=None):
        reg = self.get_object()
        reg.status = "approved"
        reg.approved_by = request.user
        reg.approved_at = timezone.now()
        reg.save()
        reg.attendance.status = Attendance.Status.REGULARIZED
        reg.attendance.save()
        return Response({"detail": "Regularization approved."})

    @action(detail=True, methods=["post"], permission_classes=[IsHRAdmin])
    def reject(self, request, pk=None):
        reg = self.get_object()
        reg.status = "rejected"
        reg.approved_by = request.user
        reg.approved_at = timezone.now()
        reg.save()
        return Response({"detail": "Regularization rejected."})
