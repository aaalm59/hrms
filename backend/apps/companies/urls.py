from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register("settings", views.CompanySettingsViewSet, basename="company-settings")
router.register("holidays", views.CompanyHolidayViewSet, basename="company-holiday")
router.register("", views.CompanyViewSet, basename="company")

urlpatterns = [
    path(
        "settings/",
        views.CompanySettingsViewSet.as_view({"get": "list", "patch": "partial_update_current"}),
        name="company-settings-current",
    ),
    path("", include(router.urls)),
]
