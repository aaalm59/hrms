import datetime
from decimal import Decimal

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apps.attendance.models import Attendance
from apps.audit_logs.models import ActivityLog
from apps.authentication.models import User
from apps.companies.models import Company, CompanySettings
from apps.employees.models import Department, Designation, Employee, Team
from apps.leaves.models import LeaveApproval, LeaveBalance, LeavePolicy, LeaveRequest, LeaveTransaction, LeaveType
from apps.notifications.models import Notification
from apps.payroll.models import Payroll, SalaryStructure
from apps.rbac.models import Role, UserRole


def results(response):
    data = response.json()
    return data.get("results", data)


@override_settings(CELERY_TASK_ALWAYS_EAGER=True)
class PreDeploymentValidationTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.company_a = cls.company("Acme India", "acme-india", "admin@acme.test")
        cls.company_b = cls.company("Beta India", "beta-india", "admin@beta.test")
        cls.roles = {}
        for company in [cls.company_a, cls.company_b]:
            cls.roles[company.id] = {
                name: Role.objects.create(company=company, name=name, display_name=name.replace("_", " ").title())
                for name in [
                    "company_admin",
                    "hr_admin",
                    "payroll_manager",
                    "recruiter",
                    "manager",
                    "team_lead",
                    "employee",
                ]
            }

        cls.super_admin = cls.user("super@test.local", None, is_super_admin=True, password="Admin@123")
        cls.company_admin = cls.user("company-admin@acme.test", cls.company_a, "company_admin")
        cls.hr_admin = cls.user("hr@acme.test", cls.company_a, "hr_admin")
        cls.payroll_manager = cls.user("payroll@acme.test", cls.company_a, "payroll_manager")
        cls.recruiter = cls.user("recruiter@acme.test", cls.company_a, "recruiter")
        cls.manager_user = cls.user("manager@acme.test", cls.company_a, "manager")
        cls.team_lead_user = cls.user("lead@acme.test", cls.company_a, "team_lead")
        cls.employee_user = cls.user("employee@acme.test", cls.company_a, "employee")
        cls.other_admin = cls.user("company-admin@beta.test", cls.company_b, "company_admin")

        cls.department = Department.all_objects.create(company=cls.company_a, name="Engineering", code="ENG")
        cls.other_department = Department.all_objects.create(company=cls.company_b, name="Finance", code="FIN")
        cls.designation = Designation.all_objects.create(company=cls.company_a, department=cls.department, name="Engineer")
        cls.manager = cls.employee("MGR001", "Manager", "One", cls.manager_user, cls.department, cls.designation)
        cls.team_lead = cls.employee("TLD001", "Lead", "One", cls.team_lead_user, cls.department, cls.designation, cls.manager)
        cls.employee_profile = cls.employee("EMP001", "Employee", "One", cls.employee_user, cls.department, cls.designation, cls.team_lead)
        cls.hr_profile = cls.employee("HR001", "HR", "Admin", cls.hr_admin, cls.department, cls.designation)
        cls.team = Team.all_objects.create(
            company=cls.company_a,
            name="Platform",
            department=cls.department,
            lead=cls.team_lead,
            reporting_manager=cls.manager,
        )
        cls.employee_profile.team = cls.team
        cls.employee_profile.save(update_fields=["team"])

        cls.other_employee = cls.employee(
            "BET001",
            "Beta",
            "Employee",
            cls.user("employee@beta.test", cls.company_b, "employee"),
            cls.other_department,
            None,
            company=cls.company_b,
        )

        cls.leave_type = LeaveType.all_objects.create(
            company=cls.company_a,
            name="Casual Leave",
            code="CL",
            days_per_year=Decimal("12"),
            requires_hr_approval=True,
            is_paid=True,
            is_active=True,
        )
        LeaveBalance.all_objects.create(
            company=cls.company_a,
            employee=cls.employee_profile,
            leave_type=cls.leave_type,
            year=timezone.now().year,
            total_days=Decimal("12"),
        )
        cls.salary_structure = SalaryStructure.all_objects.create(company=cls.company_a, name="Standard")

    @staticmethod
    def company(name, slug, email):
        company = Company.objects.create(name=name, slug=slug, email=email, status="active", is_active=True)
        CompanySettings.objects.create(company=company, working_days=["Monday"], weekly_off_days=["Sunday"])
        return company

    @classmethod
    def user(cls, email, company, role_name=None, is_super_admin=False, password="Admin@123"):
        user = User.objects.create_user(
            username=email,
            email=email,
            password=password,
            company=company,
            is_super_admin=is_super_admin,
            status="active",
        )
        if role_name:
            UserRole.objects.create(user=user, role=cls.roles[company.id][role_name])
        return user

    @staticmethod
    def employee(employee_id, first_name, last_name, user, department, designation, manager=None, company=None):
        company = company or user.company
        return Employee.all_objects.create(
            company=company,
            employee_id=employee_id,
            user=user,
            first_name=first_name,
            last_name=last_name,
            email=user.email,
            phone="9999999999",
            gender="male",
            department=department,
            designation=designation,
            reporting_manager=manager,
            employment_type="full_time",
            date_of_joining=datetime.date(2024, 1, 1),
            status="active",
            is_active=True,
        )

    def auth(self, user):
        self.client.force_authenticate(user=user)

    def test_jwt_authentication_and_protected_api_contracts(self):
        response = self.client.post("/api/v1/auth/login/", {"email": self.employee_user.email, "password": "Admin@123"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.json())
        self.assertIn("refresh", response.json())

        self.client.force_authenticate(user=None)
        protected = self.client.get("/api/v1/employees/")
        self.assertEqual(protected.status_code, status.HTTP_401_UNAUTHORIZED)

        token = response.json()["access"]
        jwt_client = self.client.__class__()
        jwt_client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
        own_leaves = jwt_client.get("/api/v1/leaves/")
        self.assertEqual(own_leaves.status_code, status.HTTP_200_OK)

    def test_rbac_dashboard_and_module_api_permissions(self):
        matrix = [
            (self.super_admin, "/api/v1/dashboards/super-admin/", 200),
            (self.company_admin, "/api/v1/dashboards/company-admin/", 200),
            (self.hr_admin, "/api/v1/dashboards/hr/", 200),
            (self.payroll_manager, "/api/v1/dashboards/payroll-manager/", 200),
            (self.recruiter, "/api/v1/dashboards/recruiter/", 200),
            (self.manager_user, "/api/v1/dashboards/manager/", 200),
            (self.team_lead_user, "/api/v1/dashboards/team-lead/", 200),
            (self.employee_user, "/api/v1/dashboards/employee/", 200),
            (self.employee_user, "/api/v1/dashboards/hr/", 403),
            (self.recruiter, "/api/v1/payroll/", 403),
            (self.payroll_manager, "/api/v1/recruitment/jobs/", 403),
        ]
        for user, path, expected in matrix:
            self.auth(user)
            with self.subTest(user=user.email, path=path):
                self.assertEqual(self.client.get(path).status_code, expected)

        self.auth(self.recruiter)
        self.assertEqual(self.client.get("/api/v1/recruitment/jobs/").status_code, 200)
        self.auth(self.manager_user)
        self.assertEqual(self.client.get("/api/v1/employees/").status_code, 200)
        self.assertEqual(self.client.post("/api/v1/employees/", {}).status_code, 403)
        self.auth(self.employee_user)
        self.assertEqual(self.client.get("/api/v1/employees/").status_code, 403)
        self.assertEqual(self.client.post("/api/v1/leaves/types/", {"name": "Blocked", "code": "BL", "days_per_year": 1}).status_code, 403)

    def test_multi_tenant_isolation_and_super_admin_company_scope(self):
        self.auth(self.company_admin)
        response = self.client.get(f"/api/v1/employees/?company_id={self.company_b.id}&page_size=100")
        self.assertEqual(response.status_code, 200)
        self.assertTrue(results(response))
        self.assertTrue(all(item["company_name"] == self.company_a.name for item in results(response)))

        self.auth(self.other_admin)
        response = self.client.get("/api/v1/employees/?page_size=100")
        self.assertEqual(response.status_code, 200)
        self.assertEqual({item["company_name"] for item in results(response)}, {self.company_b.name})

        self.auth(self.super_admin)
        response = self.client.get(f"/api/v1/employees/?company_id={self.company_b.id}&page_size=100")
        self.assertEqual(response.status_code, 200)
        self.assertEqual({item["company_name"] for item in results(response)}, {self.company_b.name})

    def test_dashboard_response_shapes_search_filters_and_pagination(self):
        self.auth(self.hr_admin)
        dashboard = self.client.get("/api/v1/dashboards/hr/")
        self.assertEqual(dashboard.status_code, 200)
        for key in ["total_employees", "present_today", "department_headcount", "attendance_trend"]:
            self.assertIn(key, dashboard.json())

        employees = self.client.get("/api/v1/employees/?search=Employee&page=1&page_size=2")
        self.assertEqual(employees.status_code, 200)
        self.assertIn("results", employees.json())
        self.assertLessEqual(len(employees.json()["results"]), 2)

        leaves = self.client.get("/api/v1/leaves/types/?search=Casual")
        self.assertEqual(leaves.status_code, 200)
        self.assertTrue(any(item["code"] == "CL" for item in results(leaves)))

    def test_leave_workflow_hierarchy_escalation_balance_calendar_and_notifications(self):
        self.auth(self.employee_user)
        apply_response = self.client.post(
            "/api/v1/leaves/",
            {
                "leave_type": self.leave_type.id,
                "from_date": "2026-06-01",
                "to_date": "2026-06-02",
                "day_type": "full_day",
                "reason": "Family event",
            },
        )
        self.assertEqual(apply_response.status_code, 201, apply_response.json())
        leave_id = apply_response.json()["id"]
        leave = LeaveRequest.all_objects.get(id=leave_id)
        self.assertEqual(leave.approvals.count(), 3)
        self.assertEqual(leave.approvals.order_by("level").first().approver, self.team_lead_user)
        self.assertTrue(Notification.all_objects.filter(recipient=self.team_lead_user, data__leave_request_id=leave_id).exists())

        self.auth(self.team_lead_user)
        first_approval = self.client.post(f"/api/v1/leaves/{leave_id}/review/", {"action": "approve", "comment": "ok"})
        self.assertEqual(first_approval.status_code, 200)
        self.assertEqual(first_approval.json()["status"], "manager_approved")

        self.auth(self.manager_user)
        second_approval = self.client.post(f"/api/v1/leaves/{leave_id}/review/", {"action": "approve", "comment": "ok"})
        self.assertEqual(second_approval.status_code, 200)
        self.assertEqual(second_approval.json()["current_approver_name"], self.hr_admin.get_full_name() or self.hr_admin.email)

        self.auth(self.hr_admin)
        final_approval = self.client.post(f"/api/v1/leaves/{leave_id}/review/", {"action": "approve", "comment": "approved"})
        self.assertEqual(final_approval.status_code, 200)
        self.assertEqual(final_approval.json()["status"], "approved")
        balance = LeaveBalance.all_objects.get(employee=self.employee_profile, leave_type=self.leave_type)
        self.assertEqual(balance.used_days, Decimal("2.00"))
        self.assertEqual(balance.pending_days, Decimal("0.00"))
        self.assertTrue(Notification.all_objects.filter(recipient=self.employee_user, title__icontains="approved").exists())

        calendar = self.client.get("/api/v1/leaves/calendar/?start=2026-06-01&end=2026-06-30")
        self.assertEqual(calendar.status_code, 200)
        self.assertTrue(any(item["id"] == leave_id for item in calendar.json()["leaves"]))

        self.auth(self.employee_user)
        escalation = self.client.post(
            "/api/v1/leaves/",
            {
                "leave_type": self.leave_type.id,
                "from_date": "2026-06-03",
                "to_date": "2026-06-03",
                "day_type": "full_day",
                "reason": "Urgent work",
            },
        )
        self.assertEqual(escalation.status_code, 201)
        escalation_id = escalation.json()["id"]
        self.auth(self.team_lead_user)
        escalated = self.client.post(f"/api/v1/leaves/{escalation_id}/review/", {"action": "escalate", "comment": "Need HR"})
        self.assertEqual(escalated.status_code, 200)
        self.assertEqual(escalated.json()["status"], "escalated")
        self.assertTrue(
            LeaveApproval.all_objects.filter(leave_request_id=escalation_id, approver=self.hr_admin, status="pending").exists()
        )

    def test_crud_across_core_modules_and_audit_tracking(self):
        self.auth(self.super_admin)
        company_payload = {"name": "CrudCo", "email": "crud@example.test", "status": "trial", "country": "India"}
        company = self.client.post("/api/v1/companies/", company_payload)
        self.assertEqual(company.status_code, 201, company.json())
        company_id = company.json()["id"]
        self.assertEqual(self.client.patch(f"/api/v1/companies/{company_id}/", {"city": "Pune"}).status_code, 200)

        self.auth(self.hr_admin)
        department = self.client.post("/api/v1/employees/departments/", {"name": "QA", "code": "QA"})
        self.assertEqual(department.status_code, 201, department.json())
        designation = self.client.post("/api/v1/employees/designations/", {"name": "QA Engineer", "department": department.json()["id"]})
        self.assertEqual(designation.status_code, 201, designation.json())
        employee = self.client.post(
            "/api/v1/employees/",
            {
                "first_name": "Crud",
                "last_name": "Employee",
                "email": "crud.employee@acme.test",
                "phone": "9999999998",
                "gender": "male",
                "department": department.json()["id"],
                "designation": designation.json()["id"],
                "date_of_joining": "2024-05-01",
                "role_name": "employee",
                "password": "Admin@123",
            },
        )
        self.assertEqual(employee.status_code, 201, employee.json())
        team = self.client.post(
            "/api/v1/employees/teams/",
            {"name": "QA Team", "department": department.json()["id"], "lead": self.team_lead.id, "reporting_manager": self.manager.id},
        )
        self.assertEqual(team.status_code, 201, team.json())
        leave_type = self.client.post(
            "/api/v1/leaves/types/",
            {"name": "Test Leave", "code": "TL", "days_per_year": "5", "is_paid": True, "requires_hr_approval": False},
        )
        self.assertEqual(leave_type.status_code, 201, leave_type.json())

        attendance = self.client.post(
            "/api/v1/attendance/",
            {"employee": self.employee_profile.id, "date": "2026-06-05", "status": Attendance.Status.PRESENT},
        )
        self.assertEqual(attendance.status_code, 201, attendance.json())

        self.auth(self.payroll_manager)
        payroll = self.client.post("/api/v1/payroll/", {"month": 6, "year": 2026})
        self.assertEqual(payroll.status_code, 201, payroll.json())

        self.auth(self.recruiter)
        job = self.client.post(
            "/api/v1/recruitment/jobs/",
            {
                "title": "QA Analyst",
                "department": self.department.id,
                "designation": self.designation.id,
                "description": "Test role",
                "employment_type": "full_time",
                "vacancies": 1,
            },
        )
        self.assertEqual(job.status_code, 201, job.json())
        resume = SimpleUploadedFile("resume.pdf", b"resume", content_type="application/pdf")
        candidate = self.client.post(
            "/api/v1/recruitment/candidates/",
            {
                "job_post": job.json()["id"],
                "first_name": "Candidate",
                "last_name": "One",
                "email": "candidate@example.test",
                "phone": "9999990000",
                "resume": resume,
            },
            format="multipart",
        )
        self.assertEqual(candidate.status_code, 201, candidate.json())

        self.assertTrue(ActivityLog.objects.filter(action="POST", model_name__contains="/api/v1/recruitment/candidates/").exists())

        self.auth(self.hr_admin)
        self.assertEqual(self.client.patch(f"/api/v1/leaves/types/{leave_type.json()['id']}/", {"days_per_year": "6"}).status_code, 200)
        self.assertEqual(self.client.delete(f"/api/v1/leaves/types/{leave_type.json()['id']}/").status_code, 204)

    def test_automatic_leave_credit_policy_engine_and_logs(self):
        self.auth(self.company_admin)
        defaults = self.client.post("/api/v1/leaves/policies/ensure_defaults/")
        self.assertEqual(defaults.status_code, 200, defaults.json())
        self.assertTrue(LeavePolicy.all_objects.filter(company=self.company_a, leave_type__code="EL", credit_amount=1).exists())
        self.assertTrue(LeavePolicy.all_objects.filter(company=self.company_a, leave_type__code="CL", credit_amount=1).exists())
        self.assertTrue(LeavePolicy.all_objects.filter(company=self.company_a, leave_type__code="FL", credit_amount=5).exists())

        run = self.client.post("/api/v1/leaves/policies/run_credits/", {"credit_date": "2026-01-05", "force": True})
        self.assertEqual(run.status_code, 200, run.json())
        fl_type = LeaveType.all_objects.get(company=self.company_a, code="FL")
        fl_balance = LeaveBalance.all_objects.get(employee=self.employee_profile, leave_type=fl_type, year=2026)
        self.assertEqual(fl_balance.total_days, Decimal("5.00"))
        self.assertTrue(
            LeaveTransaction.all_objects.filter(
                employee=self.employee_profile,
                leave_type=fl_type,
                transaction_type=LeaveTransaction.TransactionType.CREDIT,
                days=Decimal("5.00"),
            ).exists()
        )

        run_month_end = self.client.post("/api/v1/leaves/policies/run_credits/", {"credit_date": "2026-01-31", "force": True})
        self.assertEqual(run_month_end.status_code, 200, run_month_end.json())
        el_type = LeaveType.all_objects.get(company=self.company_a, code="EL")
        cl_type = LeaveType.all_objects.get(company=self.company_a, code="CL")
        self.assertEqual(LeaveBalance.all_objects.get(employee=self.employee_profile, leave_type=el_type, year=2026).total_days, Decimal("1.00"))
        self.assertEqual(LeaveBalance.all_objects.get(employee=self.employee_profile, leave_type=cl_type, year=2026).total_days, Decimal("13.00"))

        logs = self.client.get("/api/v1/leaves/credit-logs/?page_size=20")
        self.assertEqual(logs.status_code, 200)
        self.assertGreaterEqual(len(results(logs)), 3)
        tx = self.client.get("/api/v1/leaves/transactions/?page_size=20")
        self.assertEqual(tx.status_code, 200)
        self.assertTrue(any(item["transaction_type"] == "credit" for item in results(tx)))
