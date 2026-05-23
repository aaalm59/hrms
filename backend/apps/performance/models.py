from django.db import models
from apps.core.models import TenantModel


class AppraisalCycle(TenantModel):
    name = models.CharField(max_length=100)
    start_date = models.DateField()
    end_date = models.DateField()
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "appraisal_cycles"

    def __str__(self):
        return self.name


class Goal(TenantModel):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        IN_PROGRESS = "in_progress", "In Progress"
        COMPLETED = "completed", "Completed"
        MISSED = "missed", "Missed"

    employee = models.ForeignKey("employees.Employee", on_delete=models.CASCADE, related_name="goals")
    appraisal_cycle = models.ForeignKey(AppraisalCycle, on_delete=models.CASCADE, related_name="goals")
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    target = models.CharField(max_length=255)
    achievement = models.CharField(max_length=255, blank=True)
    weightage = models.DecimalField(max_digits=5, decimal_places=2, default=100)
    due_date = models.DateField()
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)

    class Meta:
        db_table = "performance_goals"


class PerformanceReview(TenantModel):
    class Rating(models.IntegerChoices):
        POOR = 1, "Poor"
        BELOW_AVERAGE = 2, "Below Average"
        AVERAGE = 3, "Average"
        GOOD = 4, "Good"
        EXCELLENT = 5, "Excellent"

    employee = models.ForeignKey("employees.Employee", on_delete=models.CASCADE, related_name="reviews")
    reviewer = models.ForeignKey("authentication.User", on_delete=models.SET_NULL, null=True, related_name="given_reviews")
    appraisal_cycle = models.ForeignKey(AppraisalCycle, on_delete=models.CASCADE)
    self_rating = models.IntegerField(choices=Rating.choices, null=True, blank=True)
    manager_rating = models.IntegerField(choices=Rating.choices, null=True, blank=True)
    final_rating = models.DecimalField(max_digits=4, decimal_places=2, null=True, blank=True)
    strengths = models.TextField(blank=True)
    areas_of_improvement = models.TextField(blank=True)
    comments = models.TextField(blank=True)
    is_submitted = models.BooleanField(default=False)
    submitted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "performance_reviews"
        unique_together = [["company", "employee", "appraisal_cycle"]]
