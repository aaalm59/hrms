from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("employees", "0002_add_team_model"),
        ("leaves", "0001_initial"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name="leavetype",
            name="allow_negative_balance",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="leavetype",
            name="is_encashable",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="leavetype",
            name="max_negative_days",
            field=models.DecimalField(decimal_places=2, default=0, max_digits=5),
        ),
        migrations.AddField(
            model_name="leavetype",
            name="requires_hr_approval",
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name="leavebalance",
            name="encashed_days",
            field=models.DecimalField(decimal_places=2, default=0, max_digits=5),
        ),
        migrations.AddField(
            model_name="leaverequest",
            name="current_approval_level",
            field=models.PositiveSmallIntegerField(default=1),
        ),
        migrations.AddField(
            model_name="leaverequest",
            name="final_decision_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AlterField(
            model_name="leaverequest",
            name="status",
            field=models.CharField(
                choices=[
                    ("pending", "Pending"),
                    ("manager_approved", "Manager Approved"),
                    ("approved", "Approved"),
                    ("rejected", "Rejected"),
                    ("cancelled", "Cancelled"),
                    ("escalated", "Escalated"),
                ],
                default="pending",
                max_length=20,
            ),
        ),
        migrations.CreateModel(
            name="Holiday",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("name", models.CharField(max_length=150)),
                ("date", models.DateField()),
                (
                    "holiday_type",
                    models.CharField(
                        choices=[
                            ("public", "Public Holiday"),
                            ("restricted", "Restricted Holiday"),
                            ("company", "Company Holiday"),
                        ],
                        default="public",
                        max_length=20,
                    ),
                ),
                ("is_active", models.BooleanField(default=True)),
                (
                    "company",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="%(app_label)s_%(class)s_set",
                        to="companies.company",
                    ),
                ),
                (
                    "department",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="holidays",
                        to="employees.department",
                    ),
                ),
            ],
            options={"db_table": "holidays", "ordering": ["date"], "unique_together": {("company", "date", "name")}},
        ),
        migrations.CreateModel(
            name="ReportingManager",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("level", models.PositiveSmallIntegerField(default=1)),
                ("is_active", models.BooleanField(default=True)),
                (
                    "company",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="%(app_label)s_%(class)s_set",
                        to="companies.company",
                    ),
                ),
                (
                    "employee",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="reporting_links",
                        to="employees.employee",
                    ),
                ),
                (
                    "manager",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="managed_reporting_links",
                        to="employees.employee",
                    ),
                ),
            ],
            options={
                "db_table": "reporting_managers",
                "ordering": ["level"],
                "unique_together": {("company", "employee", "level")},
            },
        ),
        migrations.CreateModel(
            name="LeaveApproval",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("role", models.CharField(max_length=30)),
                ("level", models.PositiveSmallIntegerField()),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("pending", "Pending"),
                            ("approved", "Approved"),
                            ("rejected", "Rejected"),
                            ("escalated", "Escalated"),
                            ("skipped", "Skipped"),
                        ],
                        default="pending",
                        max_length=20,
                    ),
                ),
                ("comment", models.TextField(blank=True)),
                ("acted_at", models.DateTimeField(blank=True, null=True)),
                (
                    "approver",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="leave_approval_tasks",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "approver_employee",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="leave_approval_tasks",
                        to="employees.employee",
                    ),
                ),
                (
                    "company",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="%(app_label)s_%(class)s_set",
                        to="companies.company",
                    ),
                ),
                (
                    "leave_request",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="approvals",
                        to="leaves.leaverequest",
                    ),
                ),
            ],
            options={
                "db_table": "leave_approvals",
                "ordering": ["level", "id"],
                "unique_together": {("company", "leave_request", "level")},
            },
        ),
    ]
