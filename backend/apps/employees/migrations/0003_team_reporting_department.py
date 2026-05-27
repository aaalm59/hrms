from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("employees", "0002_add_team_model"),
    ]

    operations = [
        migrations.AddField(
            model_name="team",
            name="department",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="teams",
                to="employees.department",
            ),
        ),
        migrations.AddField(
            model_name="team",
            name="reporting_manager",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="managed_teams",
                to="employees.employee",
            ),
        ),
    ]
