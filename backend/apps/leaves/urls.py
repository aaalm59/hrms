from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register("types", views.LeaveTypeViewSet, basename="leave-type")
router.register("balances", views.LeaveBalanceViewSet, basename="leave-balance")
router.register("reporting-managers", views.ReportingManagerViewSet, basename="reporting-manager")
router.register("policies", views.LeavePolicyViewSet, basename="leave-policy")
router.register("transactions", views.LeaveTransactionViewSet, basename="leave-transaction")
router.register("credit-logs", views.LeaveCreditLogViewSet, basename="leave-credit-log")
router.register("holidays", views.HolidayViewSet, basename="holiday")
router.register("", views.LeaveRequestViewSet, basename="leave-request")

urlpatterns = [path("", include(router.urls))]
