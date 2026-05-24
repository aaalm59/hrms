from django.urls import path
from . import views

urlpatterns = [
    path("super-admin/", views.SuperAdminDashboardView.as_view(), name="super-admin-dashboard"),
    path("company-admin/", views.CompanyAdminDashboardView.as_view(), name="company-admin-dashboard"),
    path("hr/", views.HRDashboardView.as_view(), name="hr-dashboard"),
    path("payroll-manager/", views.PayrollManagerDashboardView.as_view(), name="payroll-manager-dashboard"),
    path("recruiter/", views.RecruiterDashboardView.as_view(), name="recruiter-dashboard"),
    path("manager/", views.ManagerDashboardView.as_view(), name="manager-dashboard"),
    path("team-lead/", views.TeamLeadDashboardView.as_view(), name="team-lead-dashboard"),
    path("employee/", views.EmployeeDashboardView.as_view(), name="employee-dashboard"),
    path("team-calendar/", views.TeamCalendarView.as_view(), name="team-calendar"),
]
