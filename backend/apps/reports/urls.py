from django.urls import path
from . import views

urlpatterns = [
    path("attendance/", views.AttendanceReportView.as_view(), name="attendance-report"),
    path("leaves/", views.LeaveReportView.as_view(), name="leave-report"),
    path("payroll/", views.PayrollReportView.as_view(), name="payroll-report"),
    path("headcount/", views.HeadcountReportView.as_view(), name="headcount-report"),
]
