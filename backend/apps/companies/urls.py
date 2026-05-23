from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register("", views.CompanyViewSet, basename="company")
router.register("settings", views.CompanySettingsViewSet, basename="company-settings")
router.register("holidays", views.CompanyHolidayViewSet, basename="company-holiday")

urlpatterns = [path("", include(router.urls))]
