import os
import django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")
django.setup()

from django.utils import timezone
from django.utils.text import slugify

# ─── 1. Super Admin ───────────────────────────────────────
from apps.authentication.models import User

superadmin, created = User.objects.get_or_create(
    email="superadmin@hrms.com",
    defaults={
        "username": "superadmin",
        "first_name": "Super",
        "last_name": "Admin",
        "is_super_admin": True,
        "is_staff": True,
        "is_superuser": True,
        "status": "active",
    }
)
if created:
    superadmin.set_password("Admin@123")
    superadmin.save()
    print(f"✅ Super Admin created: superadmin@hrms.com / Admin@123")
else:
    print(f"ℹ️  Super Admin already exists")

# ─── 2. Sample Company ────────────────────────────────────
from apps.companies.models import Company, CompanySettings

company, created = Company.objects.get_or_create(
    slug="techcorp-india",
    defaults={
        "name": "TechCorp India Pvt Ltd",
        "email": "hr@techcorp.in",
        "phone": "+91-9876543210",
        "website": "https://techcorp.in",
        "address": "123, MG Road, Bangalore",
        "city": "Bangalore",
        "state": "Karnataka",
        "country": "India",
        "pincode": "560001",
        "timezone": "Asia/Kolkata",
        "currency": "INR",
        "status": "active",
        "max_employees": 100,
    }
)
if created:
    CompanySettings.objects.create(
        company=company,
        working_days=["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        weekly_off_days=["Saturday", "Sunday"],
    )
    print(f"✅ Company created: {company.name}")
else:
    print(f"ℹ️  Company already exists: {company.name}")

# ─── 3. Subscription Plan ─────────────────────────────────
from apps.subscriptions.models import Plan, Subscription
import datetime

basic_plan, _ = Plan.objects.get_or_create(
    tier="basic",
    defaults={
        "name": "Basic",
        "price_monthly": 999,
        "price_yearly": 9999,
        "max_employees": 50,
        "max_storage_gb": 5,
        "features": ["attendance", "leaves", "payroll"],
        "is_active": True,
    }
)
standard_plan, _ = Plan.objects.get_or_create(
    tier="standard",
    defaults={
        "name": "Standard",
        "price_monthly": 2499,
        "price_yearly": 24999,
        "max_employees": 200,
        "max_storage_gb": 20,
        "features": ["attendance", "leaves", "payroll", "recruitment", "performance"],
        "is_active": True,
    }
)
enterprise_plan, _ = Plan.objects.get_or_create(
    tier="enterprise",
    defaults={
        "name": "Enterprise",
        "price_monthly": 4999,
        "price_yearly": 49999,
        "max_employees": 99999,
        "max_storage_gb": 100,
        "features": ["all"],
        "is_active": True,
    }
)
print(f"✅ Plans created: Basic / Standard / Enterprise")

sub, _ = Subscription.objects.get_or_create(
    company=company,
    defaults={
        "plan": standard_plan,
        "status": "active",
        "billing_cycle": "monthly",
        "start_date": datetime.date.today(),
        "end_date": datetime.date.today().replace(year=datetime.date.today().year + 1),
        "amount_paid": 2499,
    }
)
print(f"✅ Subscription created: {company.name} → Standard Plan")

# ─── 4. RBAC Roles ────────────────────────────────────────
from apps.rbac.models import Role

roles_data = [
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
for name, display in roles_data:
    Role.objects.get_or_create(
        company=company,
        name=name,
        defaults={"display_name": display, "is_system_role": True}
    )
print(f"✅ Roles created: {len(roles_data)} roles")

# ─── 5. Company Admin User ────────────────────────────────
from apps.rbac.models import UserRole

company_admin_user, created = User.objects.get_or_create(
    email="admin@techcorp.in",
    defaults={
        "username": "techcorp_admin",
        "first_name": "Rahul",
        "last_name": "Sharma",
        "company": company,
        "is_super_admin": False,
        "status": "active",
    }
)
if created:
    company_admin_user.set_password("Admin@123")
    company_admin_user.save()
    print(f"✅ Company Admin created: admin@techcorp.in / Admin@123")

admin_role = Role.objects.get(company=company, name="company_admin")
UserRole.objects.get_or_create(user=company_admin_user, role=admin_role)

# ─── 6. HR Admin User ─────────────────────────────────────
hr_user, created = User.objects.get_or_create(
    email="hr@techcorp.in",
    defaults={
        "username": "techcorp_hr",
        "first_name": "Priya",
        "last_name": "Verma",
        "company": company,
        "status": "active",
    }
)
if created:
    hr_user.set_password("Admin@123")
    hr_user.save()
    print(f"✅ HR Admin created: hr@techcorp.in / Admin@123")

hr_role = Role.objects.get(company=company, name="hr_admin")
UserRole.objects.get_or_create(user=hr_user, role=hr_role)

# ─── 7. Departments ───────────────────────────────────────
from apps.employees.models import Department, Designation

depts = [
    ("Engineering", "ENG"),
    ("Human Resources", "HR"),
    ("Finance", "FIN"),
    ("Sales", "SALES"),
    ("Marketing", "MKT"),
    ("Operations", "OPS"),
]
dept_objs = {}
for name, code in depts:
    d, _ = Department.objects.get_or_create(
        company=company, name=name, defaults={"code": code}
    )
    dept_objs[name] = d
print(f"✅ Departments created: {len(depts)}")

# ─── 8. Designations ──────────────────────────────────────
desigs = [
    ("Engineering", "Software Engineer", 2),
    ("Engineering", "Senior Software Engineer", 3),
    ("Engineering", "Tech Lead", 4),
    ("Engineering", "Engineering Manager", 5),
    ("Human Resources", "HR Executive", 2),
    ("Human Resources", "HR Manager", 4),
    ("Finance", "Accountant", 2),
    ("Finance", "Finance Manager", 4),
    ("Sales", "Sales Executive", 2),
    ("Sales", "Sales Manager", 4),
]
desig_objs = {}
for dept_name, desig_name, level in desigs:
    d, _ = Designation.objects.get_or_create(
        company=company,
        department=dept_objs[dept_name],
        name=desig_name,
        defaults={"level": level}
    )
    desig_objs[desig_name] = d
print(f"✅ Designations created: {len(desigs)}")

# ─── 9. Sample Employees ──────────────────────────────────
from apps.employees.models import Employee
import datetime

employees_data = [
    ("EMP001", "Arshad", "Khan", "arshad@techcorp.in", "Engineering", "Software Engineer", "male", "2023-01-15"),
    ("EMP002", "Neha", "Gupta", "neha@techcorp.in", "Engineering", "Senior Software Engineer", "female", "2022-06-01"),
    ("EMP003", "Amit", "Patel", "amit@techcorp.in", "Human Resources", "HR Executive", "male", "2023-03-10"),
    ("EMP004", "Sunita", "Rao", "sunita@techcorp.in", "Finance", "Accountant", "female", "2022-09-15"),
    ("EMP005", "Vikram", "Singh", "vikram@techcorp.in", "Sales", "Sales Executive", "male", "2023-05-01"),
    ("EMP006", "Meera", "Joshi", "meera@techcorp.in", "Engineering", "Tech Lead", "female", "2021-11-20"),
    ("EMP007", "Ravi", "Kumar", "ravi@techcorp.in", "Engineering", "Software Engineer", "male", "2023-07-01"),
    ("EMP008", "Anjali", "Shah", "anjali@techcorp.in", "Marketing", "Sales Executive", "female", "2023-02-14"),
]

emp_objs = []
for emp_id, fname, lname, email, dept_name, desig_name, gender, doj in employees_data:
    emp, created = Employee.objects.get_or_create(
        company=company,
        employee_id=emp_id,
        defaults={
            "first_name": fname,
            "last_name": lname,
            "email": email,
            "phone": f"+91-98765{emp_id[-5:]}",
            "gender": gender,
            "department": dept_objs.get(dept_name, dept_objs["Engineering"]),
            "designation": desig_objs.get(desig_name),
            "date_of_joining": datetime.date.fromisoformat(doj),
            "employment_type": "full_time",
            "status": "active",
            "is_active": True,
        }
    )
    emp_objs.append(emp)
    if created:
        # Create linked user for each employee
        emp_user, u_created = User.objects.get_or_create(
            email=email,
            defaults={
                "username": email.split("@")[0],
                "first_name": fname,
                "last_name": lname,
                "company": company,
                "status": "active",
            }
        )
        if u_created:
            emp_user.set_password("Emp@123")
            emp_user.save()
        emp.user = emp_user
        emp.save()
        emp_role = Role.objects.get(company=company, name="employee")
        UserRole.objects.get_or_create(user=emp_user, role=emp_role)

print(f"✅ Employees created: {len(employees_data)}")

# ─── 10. Leave Types ──────────────────────────────────────
from apps.leaves.models import LeaveType, LeaveBalance, LeavePolicy

leave_types = [
    ("Earned Leave", "EL", 12, True, True),
    ("Casual Leave", "CL", 12, True, False),
    ("Sick Leave", "SL", 12, True, False),
    ("Paid Leave", "PL", 18, True, True),
    ("Emergency Leave", "EM", 3, True, False),
    ("Comp-Off", "CO", 0, True, False),
    ("Maternity Leave", "ML", 180, True, False),
    ("Floater Leave", "FL", 5, True, False),
]
lt_objs = []
for name, code, days, paid, carry in leave_types:
    lt, _ = LeaveType.objects.update_or_create(
        company=company, code=code,
        defaults={
            "name": name,
            "days_per_year": days,
            "is_paid": paid,
            "is_carry_forwardable": carry,
            "is_active": True,
        }
    )
    lt_objs.append(lt)

policy_defaults = {
    "EL": {
        "accrual_frequency": "monthly",
        "credit_amount": 1,
        "monthly_credit_timing": "month_end",
        "is_carry_forward_enabled": True,
        "max_carry_forward_days": 12,
        "max_balance_days": 0,
    },
    "CL": {
        "accrual_frequency": "monthly",
        "credit_amount": 1,
        "monthly_credit_timing": "month_end",
        "is_carry_forward_enabled": False,
        "max_carry_forward_days": 0,
        "max_balance_days": 0,
    },
    "FL": {
        "accrual_frequency": "yearly",
        "credit_amount": 5,
        "yearly_credit_month": 1,
        "yearly_credit_day": 5,
        "is_carry_forward_enabled": False,
        "max_carry_forward_days": 0,
        "max_balance_days": 0,
    },
}
for lt in lt_objs:
    defaults = policy_defaults.get(lt.code)
    if defaults:
        LeavePolicy.objects.update_or_create(company=company, leave_type=lt, defaults={**defaults, "is_active": True})

# Create leave balances for employees
current_year = datetime.date.today().year
for emp in emp_objs:
    for lt in lt_objs:
        LeaveBalance.objects.get_or_create(
            company=company,
            employee=emp,
            leave_type=lt,
            year=current_year,
            defaults={
                "total_days": lt.days_per_year,
                "used_days": 0,
            }
        )
print(f"✅ Leave Types + Balances created")

# ─── 11. Sample Attendance (today) ────────────────────────
from apps.attendance.models import Attendance, Shift

morning_shift, _ = Shift.objects.get_or_create(
    company=company, name="Morning Shift",
    defaults={"start_time": "09:00", "end_time": "18:00", "grace_minutes": 15}
)

today = datetime.date.today()
for i, emp in enumerate(emp_objs):
    status = "present" if i < 6 else ("leave" if i == 6 else "absent")
    Attendance.objects.get_or_create(
        company=company, employee=emp, date=today,
        defaults={
            "shift": morning_shift,
            "status": status,
            "check_in": timezone.now().replace(hour=9, minute=5) if status == "present" else None,
            "working_hours": 8.0 if status == "present" else 0,
        }
    )
print(f"✅ Today's attendance seeded")

# ─── 12. Salary Structure ─────────────────────────────────
from apps.payroll.models import SalaryStructure, SalaryComponent, EmployeeSalary

structure, _ = SalaryStructure.objects.get_or_create(
    company=company, name="Standard Structure",
    defaults={"description": "Default salary structure", "is_active": True}
)
components = [
    ("Basic Salary", "earning", "fixed", 30000, True, True, 1),
    ("HRA", "earning", "percentage", 40, True, False, 2),
    ("Transport Allowance", "earning", "fixed", 2000, True, False, 3),
    ("Medical Allowance", "earning", "fixed", 1250, False, False, 4),
    ("PF Deduction", "deduction", "percentage", 12, True, True, 5),
    ("Professional Tax", "deduction", "fixed", 200, False, False, 6),
]
for name, ctype, cmethod, val, taxable, pf, order in components:
    SalaryComponent.objects.get_or_create(
        company=company, salary_structure=structure, name=name,
        defaults={
            "component_type": ctype,
            "calculation_method": cmethod,
            "value": val,
            "is_taxable": taxable,
            "is_pf_applicable": pf,
            "order": order,
        }
    )

# Assign salaries to employees
salaries_map = {
    "EMP001": (600000, 30000),
    "EMP002": (900000, 45000),
    "EMP003": (500000, 25000),
    "EMP004": (550000, 27500),
    "EMP005": (480000, 24000),
    "EMP006": (1200000, 60000),
    "EMP007": (580000, 29000),
    "EMP008": (520000, 26000),
}
for emp in emp_objs:
    ctc, basic = salaries_map.get(emp.employee_id, (480000, 24000))
    EmployeeSalary.objects.get_or_create(
        company=company, employee=emp, is_current=True,
        defaults={
            "salary_structure": structure,
            "ctc": ctc,
            "basic": basic,
            "effective_from": emp.date_of_joining,
            "is_current": True,
        }
    )
print(f"✅ Salary structures + employee salaries created")

# ─── 13. Sample Job Posts ─────────────────────────────────
from apps.recruitment.models import JobPost

jobs = [
    ("Senior React Developer", "Engineering", "Senior Software Engineer", "We need an experienced React developer.", 2),
    ("DevOps Engineer", "Engineering", "Tech Lead", "Looking for DevOps with Kubernetes experience.", 1),
    ("HR Executive", "Human Resources", "HR Executive", "HR executive for employee onboarding.", 1),
]
for title, dept_name, desig_name, desc, vacancies in jobs:
    JobPost.objects.get_or_create(
        company=company, title=title,
        defaults={
            "department": dept_objs.get(dept_name),
            "designation": desig_objs.get(desig_name),
            "description": desc,
            "vacancies": vacancies,
            "employment_type": "full_time",
            "status": "open",
            "posted_by": company_admin_user,
        }
    )
print(f"✅ Job posts created: {len(jobs)}")

# ─── 14. Sample Notifications ─────────────────────────────
from apps.notifications.models import Notification, Announcement

for user in [company_admin_user, hr_user]:
    Notification.objects.get_or_create(
        company=company, recipient=user,
        title="Welcome to HRMS!",
        defaults={
            "message": "Your HRMS portal is ready. Start by exploring your dashboard.",
            "notification_type": "info",
            "is_read": False,
        }
    )

Announcement.objects.get_or_create(
    company=company,
    title="HRMS Portal Launched!",
    defaults={
        "content": "We are excited to announce the launch of our new HRMS portal. All HR operations are now digital!",
        "is_pinned": True,
        "created_by": company_admin_user,
    }
)
print(f"✅ Notifications + Announcements seeded")

print()
print("=" * 55)
print("  HRMS Database Seed Complete!")
print("=" * 55)
print()
print("  LOGIN CREDENTIALS")
print("  ─────────────────────────────────────────────────")
print("  Super Admin    → superadmin@hrms.com   / Admin@123")
print("  Company Admin  → admin@techcorp.in     / Admin@123")
print("  HR Admin       → hr@techcorp.in        / Admin@123")
print("  sEmployee       → arshad@techcorp.in    / Emp@123")
print("  ─────────────────────────────────────────────────")
print("  Company: TechCorp India Pvt Ltd")
print("  Employees: 8 | Leave Types: 6 | Departments: 6")
print()
