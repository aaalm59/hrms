"""
RBAC Views
──────────
GET  /rbac/roles/                  List / create roles
POST /rbac/roles/{id}/assign-permissions/   Bulk-set permissions for a role
GET  /rbac/roles/{id}/permissions/          Get permissions for a role
GET  /rbac/permissions/            List all permissions
GET  /rbac/user-roles/             List / assign user roles
GET  /rbac/my-permissions/         Current user's effective permissions
POST /rbac/seed-permissions/       Seed standard module permissions for this company
GET  /rbac/dashboard-config/       Dashboard routing & sidebar config for the current user
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from django.db.models import Q
from apps.core.permissions import IsCompanyAdmin, IsSuperAdmin
from .models import Role, Permission, UserRole, RolePermission, SYSTEM_ROLES
from .serializers import RoleSerializer, PermissionSerializer, UserRoleSerializer


# ─── Standard module:action matrix ─────────────────────────────────────────────

STANDARD_PERMISSIONS = [
    # module, action, description
    ("employees", "view",   "View employee profiles"),
    ("employees", "create", "Create new employees"),
    ("employees", "edit",   "Edit employee details"),
    ("employees", "delete", "Delete employees"),
    ("employees", "export", "Export employee data"),

    ("leaves", "view",    "View leave requests"),
    ("leaves", "create",  "Apply for leave"),
    ("leaves", "edit",    "Edit leave requests"),
    ("leaves", "delete",  "Delete leave requests"),
    ("leaves", "approve", "Approve or reject leaves"),
    ("leaves", "export",  "Export leave reports"),

    ("attendance", "view",   "View attendance records"),
    ("attendance", "create", "Create attendance records"),
    ("attendance", "edit",   "Edit attendance records"),
    ("attendance", "export", "Export attendance data"),

    ("payroll", "view",   "View payroll data"),
    ("payroll", "create", "Create payroll"),
    ("payroll", "edit",   "Edit payroll"),
    ("payroll", "delete", "Delete payroll"),
    ("payroll", "export", "Export payroll data"),

    ("recruitment", "view",   "View recruitment data"),
    ("recruitment", "create", "Create job posts and candidates"),
    ("recruitment", "edit",   "Edit recruitment records"),
    ("recruitment", "delete", "Delete recruitment records"),

    ("teams", "view",   "View teams"),
    ("teams", "create", "Create teams"),
    ("teams", "edit",   "Edit team settings"),
    ("teams", "delete", "Delete teams"),

    ("departments", "view",   "View departments"),
    ("departments", "create", "Create departments"),
    ("departments", "edit",   "Edit departments"),
    ("departments", "delete", "Delete departments"),

    ("reports", "view",   "View reports"),
    ("reports", "export", "Export reports"),

    ("analytics", "view",   "View analytics dashboards"),

    ("settings", "view",   "View settings"),
    ("settings", "edit",   "Edit company settings"),

    ("rbac", "view",   "View roles and permissions"),
    ("rbac", "edit",   "Manage roles and permissions"),

    ("audit_logs", "view",   "View audit logs"),
]

# Default permissions per role name
DEFAULT_ROLE_PERMISSIONS = {
    "employee": [
        "employees:view", "leaves:view", "leaves:create", "attendance:view",
    ],
    "team_lead": [
        "employees:view", "leaves:view", "leaves:create", "leaves:approve",
        "attendance:view", "teams:view", "reports:view",
    ],
    "manager": [
        "employees:view", "employees:edit", "leaves:view", "leaves:create",
        "leaves:approve", "attendance:view", "attendance:edit",
        "teams:view", "teams:edit", "reports:view", "reports:export",
        "analytics:view",
    ],
    "hr_admin": [
        "employees:view", "employees:create", "employees:edit", "employees:export",
        "leaves:view", "leaves:create", "leaves:edit", "leaves:approve", "leaves:export",
        "attendance:view", "attendance:edit", "attendance:export",
        "teams:view", "teams:create", "teams:edit",
        "departments:view", "departments:create", "departments:edit",
        "reports:view", "reports:export", "analytics:view",
        "settings:view", "settings:edit",
        "audit_logs:view",
    ],
    "payroll_manager": [
        "employees:view", "payroll:view", "payroll:create", "payroll:edit", "payroll:export",
        "reports:view", "reports:export",
    ],
    "recruiter": [
        "employees:view", "recruitment:view", "recruitment:create", "recruitment:edit",
        "reports:view",
    ],
    "company_admin": [
        # Gets all permissions
        "*",
    ],
    "finance_manager": [
        "employees:view", "payroll:view", "reports:view", "reports:export", "analytics:view",
    ],
    "auditor": [
        "employees:view", "leaves:view", "attendance:view", "payroll:view",
        "reports:view", "reports:export", "analytics:view", "audit_logs:view",
    ],
}


class RoleViewSet(viewsets.ModelViewSet):
    serializer_class = RoleSerializer
    permission_classes = [IsCompanyAdmin]

    def get_queryset(self):
        if self.request.user.is_super_admin:
            company_id = self.request.query_params.get("company_id")
            if company_id:
                return Role.objects.filter(company_id=company_id).order_by("display_name", "id")
            return Role.objects.all().order_by("company_id", "display_name", "id")
        return Role.objects.filter(company=self.request.user.company).order_by("display_name", "id")

    def perform_create(self, serializer):
        if self.request.user.is_super_admin:
            company_id = self.request.data.get("company")
            serializer.save(company_id=company_id)
        else:
            serializer.save(company=self.request.user.company)

    @action(detail=True, methods=["post"])
    def assign_permissions(self, request, pk=None):
        """Bulk-set permissions for a role. Replaces existing assignments."""
        role = self.get_object()
        permission_ids = request.data.get("permission_ids", [])
        RolePermission.objects.filter(role=role).delete()
        created = 0
        for perm_id in permission_ids:
            try:
                perm = Permission.objects.get(id=perm_id)
                RolePermission.objects.create(role=role, permission=perm)
                created += 1
            except Permission.DoesNotExist:
                pass
        return Response({"detail": f"{created} permissions assigned to '{role.display_name}'."})

    @action(detail=True, methods=["get"])
    def permissions(self, request, pk=None):
        """Get all permissions assigned to a role."""
        role = self.get_object()
        perms = role.role_permissions.select_related("permission")
        return Response([
            {"id": rp.permission.id, "module": rp.permission.module, "action": rp.permission.action}
            for rp in perms
        ])


class PermissionViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = PermissionSerializer
    permission_classes = [IsCompanyAdmin]

    def get_queryset(self):
        if self.request.user.is_super_admin:
            company_id = self.request.query_params.get("company_id")
            if company_id:
                return Permission.objects.filter(
                    Q(company_id=company_id) | Q(company__isnull=True)
                ).order_by("module", "action")
            return Permission.objects.all().order_by("module", "action")
        return Permission.objects.filter(
            Q(company=self.request.user.company) | Q(company__isnull=True)
        ).order_by("module", "action")


class UserRoleViewSet(viewsets.ModelViewSet):
    serializer_class = UserRoleSerializer
    permission_classes = [IsCompanyAdmin]

    def get_queryset(self):
        if self.request.user.is_super_admin:
            return UserRole.objects.all()
        qs = UserRole.objects.filter(user__company=self.request.user.company)
        user_id = self.request.query_params.get("user_id")
        if user_id:
            qs = qs.filter(user_id=user_id)
        return qs.select_related("user", "role")

    def perform_create(self, serializer):
        serializer.save(assigned_by=self.request.user)


class MyPermissionsView(APIView):
    """Return the current user's effective permissions (flattened across all roles)."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.is_super_admin:
            return Response({
                "permissions": ["*"],
                "roles": ["super_admin"],
                "is_super_admin": True,
                "role_details": [{"name": "super_admin", "display_name": "Super Admin"}],
            })

        roles = list(request.user.roles.select_related("role").values_list("role__name", flat=True))
        role_details = list(request.user.roles.select_related("role").values("role__name", "role__display_name"))
        perms = set()
        is_admin = request.user.has_role("company_admin")

        if is_admin:
            # Company admin gets all permissions
            perms = {"*"}
        else:
            for user_role in request.user.roles.select_related("role").all():
                for rp in user_role.role.role_permissions.select_related("permission").all():
                    perms.add(f"{rp.permission.module}:{rp.permission.action}")

        return Response({
            "permissions": sorted(perms),
            "roles": roles,
            "is_super_admin": False,
            "is_company_admin": is_admin,
            "role_details": [
                {"name": r["role__name"], "display_name": r["role__display_name"]}
                for r in role_details
            ],
        })


class SeedPermissionsView(APIView):
    """
    POST /rbac/seed-permissions/
    Creates all standard module:action permissions for the company,
    then assigns them to system roles with sensible defaults.
    """
    permission_classes = [IsCompanyAdmin]

    def post(self, request):
        if request.user.is_super_admin:
            return Response(
                {"detail": "Super admin cannot seed permissions for a specific company."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        company = request.user.company
        perm_map = {}

        # 1. Ensure all standard permissions exist
        for module, action, description in STANDARD_PERMISSIONS:
            perm, _ = Permission.objects.get_or_create(
                company=company, module=module, action=action,
                defaults={"description": description},
            )
            perm_map[f"{module}:{action}"] = perm

        # 2. Ensure system roles exist
        created_roles = 0
        for role_name, role_display in SYSTEM_ROLES:
            role, was_created = Role.objects.get_or_create(
                company=company, name=role_name,
                defaults={"display_name": role_display, "is_system_role": True},
            )
            created_roles += int(was_created)

            # 3. Assign default permissions to each role
            default_perms = DEFAULT_ROLE_PERMISSIONS.get(role_name, [])
            if "*" in default_perms:
                # Company admin: assign all permissions
                for perm in perm_map.values():
                    RolePermission.objects.get_or_create(role=role, permission=perm)
            else:
                for perm_key in default_perms:
                    perm = perm_map.get(perm_key)
                    if perm:
                        RolePermission.objects.get_or_create(role=role, permission=perm)

        return Response({
            "detail": f"Standard permissions seeded. {len(perm_map)} permissions, {created_roles} new roles created.",
            "total_permissions": len(perm_map),
            "roles_created": created_roles,
        })


class DashboardConfigView(APIView):
    """
    GET /rbac/dashboard-config/
    Returns route, sidebar menu, and feature flags for the current user's role.
    Used by the frontend to drive dynamic navigation.
    """
    permission_classes = [IsAuthenticated]

    ROLE_DASHBOARD_PATH = {
        "super_admin": "/super-admin/dashboard",
        "company_admin": "/company-admin/dashboard",
        "hr_admin": "/hr/dashboard",
        "payroll_manager": "/payroll-manager/dashboard",
        "recruiter": "/recruiter/dashboard",
        "manager": "/manager/dashboard",
        "team_lead": "/team-lead/dashboard",
        "employee": "/dashboard",
        "auditor": "/dashboard",
        "finance_manager": "/dashboard",
    }

    def get(self, request):
        user = request.user
        if user.is_super_admin:
            return Response({
                "dashboard_path": "/super-admin/dashboard",
                "roles": ["super_admin"],
                "can_approve_leaves": True,
                "can_manage_employees": True,
                "can_view_analytics": True,
                "can_manage_payroll": True,
                "can_manage_rbac": True,
                "sidebar_groups": self._super_admin_sidebar(),
            })

        roles = list(user.roles.values_list("role__name", flat=True))
        primary_role = roles[0] if roles else "employee"
        dashboard_path = "/dashboard"
        for role in roles:
            if role in self.ROLE_DASHBOARD_PATH:
                dashboard_path = self.ROLE_DASHBOARD_PATH[role]
                break

        perms = set()
        for user_role in user.roles.select_related("role").all():
            for rp in user_role.role.role_permissions.select_related("permission").all():
                perms.add(f"{rp.permission.module}:{rp.permission.action}")
        is_admin = "company_admin" in roles
        if is_admin:
            perms = {"*"}

        def has(p):
            return is_admin or "*" in perms or p in perms

        return Response({
            "dashboard_path": dashboard_path,
            "roles": roles,
            "primary_role": primary_role,
            "can_approve_leaves": has("leaves:approve") or any(r in roles for r in ["manager", "team_lead", "hr_admin"]),
            "can_manage_employees": has("employees:create") or has("employees:edit"),
            "can_view_analytics": has("analytics:view"),
            "can_manage_payroll": has("payroll:create") or has("payroll:edit"),
            "can_manage_rbac": has("rbac:edit"),
            "can_view_reports": has("reports:view"),
            "can_manage_recruitment": has("recruitment:create"),
            "sidebar_groups": self._sidebar_for_roles(roles, perms, is_admin),
        })

    def _sidebar_for_roles(self, roles, perms, is_admin):
        def has(p):
            return is_admin or "*" in perms or p in perms

        groups = []

        # Overview
        overview_items = [{"label": "Dashboard", "path": "/dashboard", "icon": "LayoutDashboard"}]
        if "company_admin" in roles:
            overview_items.append({"label": "Company Admin", "path": "/company-admin/dashboard", "icon": "Building2"})
        if "hr_admin" in roles:
            overview_items.append({"label": "HR Dashboard", "path": "/hr/dashboard", "icon": "UserCog"})
        if "manager" in roles:
            overview_items.append({"label": "Manager Dashboard", "path": "/manager/dashboard", "icon": "Users"})
        if "team_lead" in roles:
            overview_items.append({"label": "Team Lead Dashboard", "path": "/team-lead/dashboard", "icon": "UserCheck"})
        if "payroll_manager" in roles:
            overview_items.append({"label": "Payroll Dashboard", "path": "/payroll-manager/dashboard", "icon": "DollarSign"})
        if "recruiter" in roles:
            overview_items.append({"label": "Recruiter Dashboard", "path": "/recruiter/dashboard", "icon": "Briefcase"})
        groups.append({"label": "Overview", "items": overview_items})

        # People
        people_items = []
        if has("employees:view"):
            people_items.append({"label": "Employees", "path": "/employees", "icon": "Users"})
        if has("teams:view"):
            people_items.append({"label": "Teams", "path": "/teams", "icon": "Network"})
        if has("recruitment:view"):
            people_items.append({"label": "Recruitment", "path": "/recruitment", "icon": "Briefcase"})
        if people_items:
            groups.append({"label": "People", "items": people_items})

        # Time & Leave
        groups.append({"label": "Time & Leave", "items": [
            {"label": "Attendance", "path": "/attendance", "icon": "Clock"},
            {"label": "Leaves", "path": "/leaves", "icon": "CalendarDays"},
        ]})

        # Performance
        if has("employees:edit") or "manager" in roles:
            groups.append({"label": "Performance", "items": [
                {"label": "Performance", "path": "/performance", "icon": "Target"},
            ]})

        # Finance
        finance_items = []
        if has("payroll:view"):
            finance_items.append({"label": "Payroll", "path": "/payroll", "icon": "DollarSign"})
        finance_items.append({"label": "Finance", "path": "/finance", "icon": "TrendingUp"})
        if finance_items:
            groups.append({"label": "Finance", "items": finance_items})

        # Insights
        insight_items = []
        if has("analytics:view"):
            insight_items.append({"label": "Analytics", "path": "/analytics", "icon": "BarChart3"})
        if has("reports:view"):
            insight_items.append({"label": "Reports", "path": "/reports", "icon": "FileBarChart"})
        if insight_items:
            groups.append({"label": "Insights", "items": insight_items})

        # System
        system_items = []
        if has("audit_logs:view"):
            system_items.append({"label": "Audit Logs", "path": "/audit-logs", "icon": "Shield"})
        if has("rbac:edit") or is_admin:
            system_items.append({"label": "Roles & Permissions", "path": "/rbac", "icon": "Lock"})
        if system_items:
            groups.append({"label": "System", "items": system_items})

        # Always accessible
        groups.append({"label": "Account", "items": [
            {"label": "Notifications", "path": "/notifications", "icon": "Bell"},
            {"label": "Settings", "path": "/settings", "icon": "Settings"},
        ]})

        return groups

    def _super_admin_sidebar(self):
        return [
            {"label": "Overview", "items": [
                {"label": "Dashboard", "path": "/super-admin/dashboard", "icon": "LayoutDashboard"},
            ]},
            {"label": "Companies", "items": [
                {"label": "Companies", "path": "/super-admin/companies", "icon": "Building2"},
                {"label": "Company Admins", "path": "/super-admin/company-admins", "icon": "UserCog"},
            ]},
            {"label": "Global Data", "items": [
                {"label": "All Employees", "path": "/super-admin/employees", "icon": "Users"},
                {"label": "Global Attendance", "path": "/super-admin/attendance", "icon": "Clock"},
                {"label": "Global Leaves", "path": "/super-admin/leaves", "icon": "CalendarDays"},
                {"label": "Global Payroll", "path": "/super-admin/payroll-overview", "icon": "DollarSign"},
            ]},
            {"label": "Platform", "items": [
                {"label": "Subscriptions", "path": "/super-admin/subscriptions", "icon": "CreditCard"},
                {"label": "Analytics", "path": "/super-admin/analytics", "icon": "BarChart3"},
                {"label": "Users", "path": "/super-admin/users", "icon": "UserCheck"},
                {"label": "RBAC", "path": "/super-admin/rbac", "icon": "Lock"},
                {"label": "Billing", "path": "/super-admin/billing", "icon": "Receipt"},
                {"label": "Monitoring", "path": "/super-admin/monitoring", "icon": "Activity"},
                {"label": "Security", "path": "/super-admin/security", "icon": "Shield"},
            ]},
        ]