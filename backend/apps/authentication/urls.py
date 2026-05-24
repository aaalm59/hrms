from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from . import views

urlpatterns = [
    path("login/", views.LoginView.as_view(), name="auth-login"),
    path("logout/", views.LogoutView.as_view(), name="auth-logout"),
    path("token/refresh/", TokenRefreshView.as_view(), name="token-refresh"),
    path("me/", views.MeView.as_view(), name="auth-me"),
    path("users/", views.UserListView.as_view(), name="auth-users"),
    path("users/create-company-user/", views.CreateCompanyUserView.as_view(), name="create-company-user"),
    path("change-password/", views.ChangePasswordView.as_view(), name="auth-change-password"),
    path("forgot-password/", views.ForgotPasswordView.as_view(), name="auth-forgot-password"),
    path("reset-password/", views.ResetPasswordView.as_view(), name="auth-reset-password"),
    path("impersonate/<int:company_id>/", views.ImpersonateView.as_view(), name="impersonate"),
    path("users/<int:user_id>/reset-password/", views.ResetUserPasswordView.as_view(), name="reset-user-password"),
]
