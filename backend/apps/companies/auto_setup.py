"""
Company Auto-Setup Service
──────────────────────────
Called when a new company is created.  Creates all default data so the
company is immediately usable without manual configuration:

  1. Default Departments (8)
  2. Default Designations per department
  3. Default Teams (linked to departments)
  4. All System Roles (from RBAC SYSTEM_ROLES)
  5. All Standard Permissions (from RBAC STANDARD_PERMISSIONS)
  6. Role → Permission mappings (DEFAULT_ROLE_PERMISSIONS)
  7. Demo Users with employee profiles:
       company_admin@<slug>.in  / Admin@123
       hr@<slug>.in             / Hr@1234
       manager@<slug>.in        / Mgr@1234
       employee@<slug>.in       / Emp@1234
  8. Default Leave Types (EL, CL, SL, FL, ML, PL)
  9. Default Leave Balances for demo employees (current year)
 10. Reporting Hierarchy for demo users

Usage:
    from apps.companies.auto_setup import auto_setup_company
    result = auto_setup_company(company, created_by=super_admin_user)
"""
import logging
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.db import transaction
from django.utils import timezone

logger = logging.getLogger(__name__)
User = get_user_model()


# ──────────────────────────────────────────────────────────────────────────────
# Reference data
# ──────────────────────────────────────────────────────────────────────────────

DEFAULT_DEPARTMENTS = [
    {"name": "Management",        "code": "MGMT"},
    {"name": "Human Resources",   "code": "HR"},
    {"name": "Engineering",       "code": "ENG"},
    {"name": "Finance",           "code": "FIN"},
    {"name": "Sales",             "code": "SALES"},
    {"name": "Marketing",         "code": "MKT"},
    {"name": "Operations",        "code": "OPS"},
    {"name": "Customer Support",  "code": "CS"},
]

# dept_code → list of designation names
DEFAULT_DESIGNATIONS = {
    "MGMT":  ["Chief Executive Officer", "Chief Operating Officer", "General Manager"],
    "HR":    ["HR Manager", "HR Executive", "HR Assistant", "Recruiter"],
    "ENG":   ["Engineering Manager", "Senior Engineer", "Software Engineer", "Junior Engineer", "QA Engineer"],
    "FIN":   ["Finance Manager", "Senior Accountant", "Accountant", "Payroll Specialist"],
    "SALES": ["Sales Manager", "Senior Sales Executive", "Sales Executive", "Business Development Manager"],
    "MKT":   ["Marketing Manager", "Content Strategist", "Digital Marketer", "Marketing Executive"],
    "OPS":   ["Operations Manager", "Operations Analyst", "Logistics Executive"],
    "CS":    ["Support Manager", "Senior Support Specialist", "Support Executive"],
}

# dept_code → team name
DEFAULT_TEAMS = {
    "MGMT":  "Leadership Team",
    "HR":    "HR Team",
    "ENG":   "Engineering Team",
    "FIN":   "Finance Team",
    "SALES": "Sales Team",
    "MKT":   "Marketing Team",
    "OPS":   "Operations Team",
    "CS":    "Support Team",
}

# Leave type definitions: (code, name, days_per_year, is_paid, gender_specific)
DEFAULT_LEAVE_TYPES = [
    ("EL", "Earned Leave",         12, True,  ""),
    ("CL", "Casual Leave",         12, True,  ""),
    ("SL", "Sick Leave",            8, True,  ""),
    ("FL", "Floater Leave",         5, True,  ""),
    ("ML", "Maternity Leave",      26, True,  "female"),
    ("PL", "Paternity Leave",       5, True,  "male"),
]


# ──────────────────────────────────────────────────────────────────────────────
# Main service function
# ──────────────────────────────────────────────────────────────────────────────

@transaction.atomic
def auto_setup_company(company, created_by=None):
    """
    Full auto-setup for a newly created company.
    Returns a summary dict of what was created.
    """
    slug = company.slug or company.name.lower().replace(" ", "")
    summary = {
        "company": company.name,
        "departments": 0,
        "designations": 0,
        "teams": 0,
        "roles": 0,
        "permissions": 0,
        "users": [],
        "leave_types": 0,
    }

    # 1 ── Departments ──────────────────────────────────────────────────────────
    from apps.employees.models import Department, Designation, Team, Employee

    dept_map = {}  # code → Department instance
    for item in DEFAULT_DEPARTMENTS:
        dept, created = Department.all_objects.get_or_create(
            company=company,
            name=item["name"],
            defaults={"code": item["code"]},
        )
        dept_map[item["code"]] = dept
        if created:
            summary["departments"] += 1

    # 2 ── Designations ─────────────────────────────────────────────────────────
    desig_map = {}  # (dept_code, name) → Designation
    for dept_code, names in DEFAULT_DESIGNATIONS.items():
        dept = dept_map.get(dept_code)
        if not dept:
            continue
        for idx, name in enumerate(names, start=1):
            desig, created = Designation.all_objects.get_or_create(
                company=company,
                department=dept,
                name=name,
                defaults={"level": idx},
            )
            desig_map[(dept_code, name)] = desig
            if created:
                summary["designations"] += 1

    # 3 ── Teams ───────────────────────────────────────────────────────────────
    team_map = {}  # dept_code → Team
    for dept_code, team_name in DEFAULT_TEAMS.items():
        dept = dept_map.get(dept_code)
        if not dept:
            continue
        team, created = Team.all_objects.get_or_create(
            company=company,
            name=team_name,
            defaults={"department": dept},
        )
        team_map[dept_code] = team
        if created:
            summary["teams"] += 1

    # 4 & 5 & 6 ── Roles, Permissions, Mappings ────────────────────────────────
    roles_created, perms_created = _seed_rbac(company, created_by)
    summary["roles"] = roles_created
    summary["permissions"] = perms_created

    # 7 ── Demo Users ──────────────────────────────────────────────────────────
    demo_accounts = _create_demo_users(company, slug, dept_map, desig_map, team_map, created_by)
    summary["users"] = demo_accounts

    # 8 ── Leave Types ─────────────────────────────────────────────────────────
    summary["leave_types"] = _seed_leave_types(company)

    # 9 ── Leave Balances for demo employees ───────────────────────────────────
    _seed_leave_balances(company)

    logger.info(
        "Auto-setup complete for company '%s': %s",
        company.name,
        summary,
    )
    return summary


# ──────────────────────────────────────────────────────────────────────────────
# RBAC seed
# ──────────────────────────────────────────────────────────────────────────────

def _seed_rbac(company, created_by=None):
    from apps.rbac.models import Role, Permission, RolePermission, SYSTEM_ROLES
    from apps.rbac.views import STANDARD_PERMISSIONS, DEFAULT_ROLE_PERMISSIONS

    perm_map = {}
    perms_created = 0
    for module, action, description in STANDARD_PERMISSIONS:
        perm, created = Permission.objects.get_or_create(
            company=company,
            module=module,
            action=action,
            defaults={"description": description},
        )
        perm_map[f"{module}:{action}"] = perm
        if created:
            perms_created += 1

    roles_created = 0
    for role_name, role_display in SYSTEM_ROLES:
        if role_name == "super_admin":
            continue  # Super admin is platform-level, not per-company
        role, was_created = Role.objects.get_or_create(
            company=company,
            name=role_name,
            defaults={"display_name": role_display, "is_system_role": True},
        )
        if was_created:
            roles_created += 1

        default_perms = DEFAULT_ROLE_PERMISSIONS.get(role_name, [])
        if "*" in default_perms:
            for perm in perm_map.values():
                RolePermission.objects.get_or_create(role=role, permission=perm)
        else:
            for perm_key in default_perms:
                perm = perm_map.get(perm_key)
                if perm:
                    RolePermission.objects.get_or_create(role=role, permission=perm)

    return roles_created, perms_created


# ──────────────────────────────────────────────────────────────────────────────
# Demo user creation
# ──────────────────────────────────────────────────────────────────────────────

DEMO_USER_SPECS = [
    # (email_prefix, first, last, role_name, dept_code, desig_name, emp_id_suffix)
    ("admin",    "Company",   "Admin",    "company_admin",    "MGMT", "General Manager",         "0001"),
    ("hr",       "HR",        "Manager",  "hr_admin",         "HR",   "HR Manager",              "0002"),
    ("manager",  "Team",      "Manager",  "manager",          "ENG",  "Engineering Manager",     "0003"),
    ("employee", "John",      "Doe",      "employee",         "ENG",  "Software Engineer",       "0004"),
]


def _create_demo_users(company, slug, dept_map, desig_map, team_map, created_by):
    from apps.employees.models import Employee
    from apps.rbac.models import Role, UserRole
    from apps.leaves.models import ReportingManager

    accounts = []
    created_employees = {}  # role_name → Employee

    for (prefix, first, last, role_name, dept_code, desig_name, emp_suffix) in DEMO_USER_SPECS:
        email = f"{prefix}@{slug}.in"
        # Use a consistent password per role type
        password_map = {
            "company_admin": "Admin@123",
            "hr_admin":      "Hr@1234",
            "manager":       "Mgr@1234",
            "employee":      "Emp@1234",
        }
        password = password_map.get(role_name, "Demo@1234")

        # Create User
        user, user_created = User.objects.get_or_create(
            email=email,
            defaults={
                "username": email,
                "first_name": first,
                "last_name": last,
                "company": company,
                "status": "active",
            },
        )
        if user_created:
            user.set_password(password)
            user.save(update_fields=["password"])

        # Assign Role
        role, _ = Role.objects.get_or_create(
            company=company,
            name=role_name,
            defaults={"display_name": role_name.replace("_", " ").title(), "is_system_role": True},
        )
        UserRole.objects.get_or_create(
            user=user,
            role=role,
            defaults={"assigned_by": created_by or user},
        )

        # Create Employee profile
        dept = dept_map.get(dept_code)
        desig = desig_map.get((dept_code, desig_name))
        team = team_map.get(dept_code)
        emp_id = f"{(company.slug or slug).upper()[:4]}-{emp_suffix}"
        employee, _ = Employee.all_objects.get_or_create(
            company=company,
            user=user,
            defaults={
                "employee_id": emp_id,
                "first_name": first,
                "last_name": last,
                "email": email,
                "phone": "9999999999",
                "gender": "female" if role_name == "hr_admin" else "male",
                "department": dept,
                "designation": desig,
                "team": team,
                "employment_type": "full_time",
                "status": "active",
                "date_of_joining": timezone.localdate(),
            },
        )
        created_employees[role_name] = employee

        accounts.append({
            "email": email,
            "password": password,
            "role": role_name,
            "name": f"{first} {last}",
        })

    # 10 ── Reporting Hierarchy ─────────────────────────────────────────────────
    # employee → manager → company_admin
    # manager → company_admin
    try:
        admin_emp = created_employees.get("company_admin")
        manager_emp = created_employees.get("manager")
        emp_emp = created_employees.get("employee")

        if manager_emp and admin_emp and manager_emp.id != admin_emp.id:
            ReportingManager.all_objects.get_or_create(
                company=company,
                employee=manager_emp,
                manager=admin_emp,
                defaults={"level": 1, "is_active": True},
            )
        if emp_emp and manager_emp and emp_emp.id != manager_emp.id:
            ReportingManager.all_objects.get_or_create(
                company=company,
                employee=emp_emp,
                manager=manager_emp,
                defaults={"level": 1, "is_active": True},
            )
            # Also set direct reporting_manager field on Employee
            emp_emp.reporting_manager = manager_emp
            emp_emp.save(update_fields=["reporting_manager"])
        if manager_emp and admin_emp:
            manager_emp.reporting_manager = admin_emp
            manager_emp.save(update_fields=["reporting_manager"])
    except Exception as exc:
        logger.warning("Reporting hierarchy setup failed: %s", exc)

    return accounts


# ──────────────────────────────────────────────────────────────────────────────
# Leave types & balances
# ──────────────────────────────────────────────────────────────────────────────

def _seed_leave_types(company):
    from apps.leaves.models import LeaveType, LeavePolicy

    created = 0
    for code, name, days, is_paid, gender in DEFAULT_LEAVE_TYPES:
        lt, was_created = LeaveType.all_objects.get_or_create(
            company=company,
            code=code,
            defaults={
                "name": name,
                "days_per_year": Decimal(str(days)),
                "is_paid": is_paid,
                "is_active": True,
                "requires_hr_approval": True,
                "is_carry_forwardable": code in ("EL",),
                "max_carry_forward_days": Decimal("15") if code == "EL" else Decimal("0"),
                "is_encashable": code in ("EL",),
                "gender_specific": gender,
            },
        )
        if was_created:
            created += 1

        # Default policy
        frequency = (
            LeavePolicy.AccrualFrequency.YEARLY
            if code in ("ML", "PL")
            else LeavePolicy.AccrualFrequency.MONTHLY
        )
        credit_amt = Decimal("1") if code not in ("ML", "PL") else Decimal(str(days))
        LeavePolicy.all_objects.get_or_create(
            company=company,
            leave_type=lt,
            defaults={
                "accrual_frequency": frequency,
                "credit_amount": credit_amt,
                "monthly_credit_timing": LeavePolicy.MonthlyCreditTiming.MONTH_END,
                "yearly_credit_month": 1,
                "yearly_credit_day": 5,
                "is_carry_forward_enabled": code == "EL",
                "max_carry_forward_days": Decimal("15") if code == "EL" else Decimal("0"),
                "max_balance_days": Decimal("0"),
                "is_active": True,
            },
        )

    return created


def _seed_leave_balances(company):
    from apps.employees.models import Employee
    from apps.leaves.models import LeaveType, LeaveBalance

    year = timezone.now().year
    employees = Employee.all_objects.filter(company=company, is_active=True)
    leave_types = LeaveType.all_objects.filter(company=company, is_active=True)

    for emp in employees:
        for lt in leave_types:
            # Skip gender-specific leave types for wrong gender
            if lt.gender_specific:
                emp_gender = getattr(emp, "gender", None)
                if emp_gender and emp_gender != lt.gender_specific:
                    continue
            LeaveBalance.all_objects.get_or_create(
                company=company,
                employee=emp,
                leave_type=lt,
                year=year,
                defaults={
                    "total_days": lt.days_per_year,
                    "used_days": Decimal("0"),
                    "pending_days": Decimal("0"),
                    "carried_forward": Decimal("0"),
                },
            )
