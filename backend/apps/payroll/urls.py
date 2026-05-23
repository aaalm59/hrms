from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register("salary-structures", views.SalaryStructureViewSet, basename="salary-structure")
router.register("employee-salaries", views.EmployeeSalaryViewSet, basename="employee-salary")
router.register("payslips", views.PayslipViewSet, basename="payslip")
router.register("", views.PayrollViewSet, basename="payroll")

urlpatterns = [path("", include(router.urls))]
