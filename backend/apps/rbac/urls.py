from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register("roles", views.RoleViewSet, basename="role")
router.register("permissions", views.PermissionViewSet, basename="permission")
router.register("user-roles", views.UserRoleViewSet, basename="user-role")

urlpatterns = [path("", include(router.urls))]
