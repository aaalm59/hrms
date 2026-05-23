from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register("shifts", views.ShiftViewSet, basename="shift")
router.register("regularizations", views.AttendanceRegularizationViewSet, basename="regularization")
router.register("", views.AttendanceViewSet, basename="attendance")

urlpatterns = [path("", include(router.urls))]
