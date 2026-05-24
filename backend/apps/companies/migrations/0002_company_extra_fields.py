from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("companies", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="company",
            name="industry",
            field=models.CharField(blank=True, max_length=100),
        ),
        migrations.AddField(
            model_name="company",
            name="gst_number",
            field=models.CharField(blank=True, max_length=20),
        ),
        migrations.AddField(
            model_name="company",
            name="pan_number",
            field=models.CharField(blank=True, max_length=20),
        ),
        migrations.AddField(
            model_name="company",
            name="description",
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name="company",
            name="module_flags",
            field=models.JSONField(default=dict, help_text="Enable/disable HRMS modules per company"),
        ),
    ]
