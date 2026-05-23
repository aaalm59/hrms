from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView, SpectacularRedocView

API = "api/v1/"

urlpatterns = [
    path("admin/", admin.site.urls),

    # Docs
    path(f"{API}schema/", SpectacularAPIView.as_view(), name="schema"),
    path(f"{API}docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger"),
    path(f"{API}redoc/", SpectacularRedocView.as_view(url_name="schema"), name="redoc"),

    # Platform-level (Super Admin)
    path(f"{API}companies/", include("apps.companies.urls")),
    path(f"{API}subscriptions/", include("apps.subscriptions.urls")),

    # Auth (multi-tenant aware)
    path(f"{API}auth/", include("apps.authentication.urls")),
    path(f"{API}rbac/", include("apps.rbac.urls")),

    # HRMS modules (all tenant-scoped)
    path(f"{API}employees/", include("apps.employees.urls")),
    path(f"{API}attendance/", include("apps.attendance.urls")),
    path(f"{API}payroll/", include("apps.payroll.urls")),
    path(f"{API}leaves/", include("apps.leaves.urls")),
    path(f"{API}recruitment/", include("apps.recruitment.urls")),
    path(f"{API}performance/", include("apps.performance.urls")),
    path(f"{API}finance/", include("apps.finance.urls")),
    path(f"{API}assets/", include("apps.assets.urls")),
    path(f"{API}tickets/", include("apps.tickets.urls")),
    path(f"{API}training/", include("apps.training.urls")),
    path(f"{API}compliance/", include("apps.compliance.urls")),

    # Analytics & Reporting
    path(f"{API}dashboards/", include("apps.dashboards.urls")),
    path(f"{API}analytics/", include("apps.analytics.urls")),
    path(f"{API}reports/", include("apps.reports.urls")),

    # Supporting modules
    path(f"{API}notifications/", include("apps.notifications.urls")),
    path(f"{API}audit-logs/", include("apps.audit_logs.urls")),
    path(f"{API}settings/", include("apps.settings_app.urls")),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
