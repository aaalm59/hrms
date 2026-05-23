from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register("jobs", views.JobPostViewSet, basename="job")
router.register("candidates", views.CandidateViewSet, basename="candidate")
router.register("interviews", views.InterviewViewSet, basename="interview")

urlpatterns = [path("", include(router.urls))]
