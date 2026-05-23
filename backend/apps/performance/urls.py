from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register("cycles", views.AppraisalCycleViewSet, basename="appraisal-cycle")
router.register("goals", views.GoalViewSet, basename="goal")
router.register("reviews", views.PerformanceReviewViewSet, basename="performance-review")

urlpatterns = [path("", include(router.urls))]
