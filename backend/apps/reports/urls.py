from django.urls import path
from . import views

urlpatterns = [
    path("", views.PlaceholderView.as_view()),
]
