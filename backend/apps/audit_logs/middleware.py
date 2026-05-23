from .models import ActivityLog


class AuditLogMiddleware:
    TRACKED_METHODS = {"POST", "PUT", "PATCH", "DELETE"}
    EXCLUDE_PATHS = {"/api/v1/auth/token/refresh/", "/admin/jsi18n/"}

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)

        if (
            request.method in self.TRACKED_METHODS
            and request.path not in self.EXCLUDE_PATHS
            and hasattr(request, "user")
            and request.user.is_authenticated
            and response.status_code < 400
        ):
            ActivityLog.objects.create(
                user=request.user,
                company=getattr(request.user, "company", None),
                action=request.method,
                model_name=request.path,
                ip_address=self._get_ip(request),
                user_agent=request.META.get("HTTP_USER_AGENT", "")[:500],
            )

        return response

    def _get_ip(self, request):
        x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
        if x_forwarded_for:
            return x_forwarded_for.split(",")[0].strip()
        return request.META.get("REMOTE_ADDR")
