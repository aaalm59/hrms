from django.urls import path
from . import views

urlpatterns = [
    path("super-admin/", views.SuperAdminDashboardView.as_view(), name="super-admin-dashboard"),
    path("company-admin/", views.CompanyAdminDashboardView.as_view(), name="company-admin-dashboard"),
    path("hr/", views.HRDashboardView.as_view(), name="hr-dashboard"),
    path("employee/", views.EmployeeDashboardView.as_view(), name="employee-dashboard"),
]
