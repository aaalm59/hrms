from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register("categories", views.ExpenseCategoryViewSet, basename="expense-category")
router.register("budgets", views.BudgetViewSet, basename="budget")
router.register("expenses", views.ExpenseViewSet, basename="expense")

urlpatterns = [path("", include(router.urls))]
