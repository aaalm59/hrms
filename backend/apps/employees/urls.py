from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register("teams", views.TeamViewSet, basename="team")
router.register("departments", views.DepartmentViewSet, basename="department")
router.register("designations", views.DesignationViewSet, basename="designation")
router.register("", views.EmployeeViewSet, basename="employee")

urlpatterns = [path("", include(router.urls))]
