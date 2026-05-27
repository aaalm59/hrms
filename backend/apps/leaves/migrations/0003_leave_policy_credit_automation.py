from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("employees", "0003_team_reporting_department"),
        ("leaves", "0002_enterprise_leave_workflow"),
    ]

    operations = [
        migrations.CreateModel(
            name="LeavePolicy",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "accrual_frequency",
                    models.CharField(
                        choices=[("monthly", "Monthly"), ("yearly", "Yearly"), ("manual", "Manual")],
                        default="manual",
                        max_length=20,
                    ),
                ),
                ("credit_amount", models.DecimalField(decimal_places=2, default=0, max_digits=5)),
                (
                    "monthly_credit_timing",
                    models.CharField(
                        choices=[
                            ("month_end", "Month End"),
                            ("next_month_first", "1st Day of Next Month"),
                            ("day_of_month", "Specific Day of Month"),
                        ],
                        default="month_end",
                        max_length=30,
                    ),
                ),
                ("monthly_credit_day", models.PositiveSmallIntegerField(default=1)),
                ("yearly_credit_month", models.PositiveSmallIntegerField(default=1)),
                ("yearly_credit_day", models.PositiveSmallIntegerField(default=5)),
                ("is_carry_forward_enabled", models.BooleanField(default=False)),
                ("max_carry_forward_days", models.DecimalField(decimal_places=2, default=0, max_digits=5)),
                ("max_balance_days", models.DecimalField(decimal_places=2, default=0, max_digits=6)),
                ("allow_negative_balance", models.BooleanField(default=False)),
                ("max_negative_days", models.DecimalField(decimal_places=2, default=0, max_digits=5)),
                ("auto_expire_days", models.PositiveIntegerField(default=0)),
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
                    "leave_type",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="policy",
                        to="leaves.leavetype",
                    ),
                ),
            ],
            options={"db_table": "leave_policies", "unique_together": {("company", "leave_type")}},
        ),
        migrations.CreateModel(
            name="LeaveCreditLog",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("period_key", models.CharField(max_length=20)),
                ("credit_date", models.DateField()),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("success", "Success"),
                            ("partial", "Partial"),
                            ("skipped", "Skipped"),
                            ("failed", "Failed"),
                        ],
                        default="success",
                        max_length=20,
                    ),
                ),
                ("employees_processed", models.PositiveIntegerField(default=0)),
                ("employees_credited", models.PositiveIntegerField(default=0)),
                ("employees_skipped", models.PositiveIntegerField(default=0)),
                ("total_days_credited", models.DecimalField(decimal_places=2, default=0, max_digits=10)),
                ("message", models.TextField(blank=True)),
                (
                    "company",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="%(app_label)s_%(class)s_set",
                        to="companies.company",
                    ),
                ),
                (
                    "leave_type",
                    models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, to="leaves.leavetype"),
                ),
                (
                    "policy",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="credit_logs",
                        to="leaves.leavepolicy",
                    ),
                ),
            ],
            options={
                "db_table": "leave_credit_logs",
                "ordering": ["-credit_date", "-created_at"],
                "unique_together": {("company", "policy", "period_key")},
            },
        ),
        migrations.CreateModel(
            name="LeaveTransaction",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "transaction_type",
                    models.CharField(
                        choices=[
                            ("credit", "Credit"),
                            ("debit", "Debit"),
                            ("encash", "Encash"),
                            ("expiry", "Expiry"),
                            ("adjustment", "Adjustment"),
                            ("carry_forward", "Carry Forward"),
                        ],
                        max_length=20,
                    ),
                ),
                ("days", models.DecimalField(decimal_places=2, max_digits=6)),
                ("balance_after", models.DecimalField(decimal_places=2, max_digits=6)),
                ("effective_date", models.DateField()),
                ("expires_on", models.DateField(blank=True, null=True)),
                ("reference", models.CharField(blank=True, max_length=120)),
                ("remarks", models.TextField(blank=True)),
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
                        related_name="leave_transactions",
                        to="employees.employee",
                    ),
                ),
                (
                    "leave_balance",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="transactions",
                        to="leaves.leavebalance",
                    ),
                ),
                (
                    "leave_type",
                    models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, to="leaves.leavetype"),
                ),
                (
                    "policy",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="transactions",
                        to="leaves.leavepolicy",
                    ),
                ),
            ],
            options={"db_table": "leave_transactions", "ordering": ["-effective_date", "-created_at"]},
        ),
    ]
