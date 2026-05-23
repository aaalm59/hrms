from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register("types", views.LeaveTypeViewSet, basename="leave-type")
router.register("balances", views.LeaveBalanceViewSet, basename="leave-balance")
router.register("", views.LeaveRequestViewSet, basename="leave-request")

urlpatterns = [path("", include(router.urls))]
