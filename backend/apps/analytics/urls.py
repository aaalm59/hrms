from django.urls import path
from . import views

urlpatterns = [
    path("company/", views.CompanyAnalyticsView.as_view(), name="company-analytics"),
    path("platform/", views.PlatformAnalyticsView.as_view(), name="platform-analytics"),
]
