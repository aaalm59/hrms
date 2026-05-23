from django.urls import path
from . import views

urlpatterns = [
    path("activity/", views.ActivityLogListView.as_view(), name="activity-logs"),
    path("logins/", views.LoginLogListView.as_view(), name="login-logs"),
]
