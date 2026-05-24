from django.db import models
from django.conf import settings


SYSTEM_ROLES = [
    ("super_admin", "Super Admin"),
    ("company_admin", "Company Admin"),
    ("hr_admin", "HR Admin"),
    ("payroll_manager", "Payroll Manager"),
    ("finance_manager", "Finance Manager"),
    ("recruiter", "Recruiter"),
    ("manager", "Manager"),
    ("team_lead", "Team Lead"),
    ("employee", "Employee"),
    ("auditor", "Auditor"),
]


class Role(models.Model):
    company = models.ForeignKey(
        "companies.Company",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="roles",
    )
    name = models.CharField(max_length=50)
    display_name = models.CharField(max_length=100)
    is_system_role = models.BooleanField(default=False)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "rbac_roles"
        unique_together = [["company", "name"]]

    def __str__(self):
        return self.display_name


class Permission(models.Model):
    class Action(models.TextChoices):
        VIEW = "view", "View"
        CREATE = "create", "Create"
        EDIT = "edit", "Edit"
        DELETE = "delete", "Delete"
        APPROVE = "approve", "Approve"
        EXPORT = "export", "Export"

    company = models.ForeignKey(
        "companies.Company",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="permissions",
    )
    module = models.CharField(max_length=50)
    action = models.CharField(max_length=20, choices=Action.choices)
    description = models.CharField(max_length=255, blank=True)

    class Meta:
        db_table = "rbac_permissions"
        unique_together = [["company", "module", "action"]]

    def __str__(self):
        return f"{self.module}:{self.action}"


class RolePermission(models.Model):
    role = models.ForeignKey(Role, on_delete=models.CASCADE, related_name="role_permissions")
    permission = models.ForeignKey(Permission, on_delete=models.CASCADE)

    class Meta:
        db_table = "rbac_role_permissions"
        unique_together = [["role", "permission"]]


class UserRole(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="roles",
    )
    role = models.ForeignKey(Role, on_delete=models.CASCADE)
    assigned_at = models.DateTimeField(auto_now_add=True)
    assigned_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="role_assignments",
    )

    class Meta:
        db_table = "rbac_user_roles"
        unique_together = [["user", "role"]]
