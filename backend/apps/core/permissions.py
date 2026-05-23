from rest_framework.permissions import BasePermission


class IsSuperAdmin(BasePermission):
    """Only platform Super Admin can access."""

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_super_admin)


class IsCompanyAdmin(BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and (request.user.is_super_admin or request.user.has_role("company_admin"))
        )


class IsHRAdmin(BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and (
                request.user.is_super_admin
                or request.user.has_role("company_admin")
                or request.user.has_role("hr_admin")
            )
        )


class IsPayrollManager(BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and (
                request.user.is_super_admin
                or request.user.has_role("company_admin")
                or request.user.has_role("hr_admin")
                or request.user.has_role("payroll_manager")
            )
        )


class IsManager(BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and (
                request.user.is_super_admin
                or request.user.has_role("company_admin")
                or request.user.has_role("hr_admin")
                or request.user.has_role("manager")
                or request.user.has_role("team_lead")
            )
        )


class IsSameTenant(BasePermission):
    """Ensures the object belongs to the current user's company."""

    def has_object_permission(self, request, view, obj):
        if request.user.is_super_admin:
            return True
        return obj.company_id == request.user.company_id
