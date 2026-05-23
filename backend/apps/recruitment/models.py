from django.db import models
from apps.core.models import TenantModel


class JobPost(TenantModel):
    class Status(models.TextChoices):
        OPEN = "open", "Open"
        CLOSED = "closed", "Closed"
        ON_HOLD = "on_hold", "On Hold"
        FILLED = "filled", "Filled"

    title = models.CharField(max_length=255)
    department = models.ForeignKey("employees.Department", on_delete=models.SET_NULL, null=True)
    designation = models.ForeignKey("employees.Designation", on_delete=models.SET_NULL, null=True)
    description = models.TextField()
    requirements = models.TextField(blank=True)
    vacancies = models.PositiveSmallIntegerField(default=1)
    employment_type = models.CharField(max_length=20)
    location = models.CharField(max_length=255, blank=True)
    min_experience_years = models.PositiveSmallIntegerField(default=0)
    max_experience_years = models.PositiveSmallIntegerField(null=True, blank=True)
    salary_min = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    salary_max = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.OPEN)
    posted_by = models.ForeignKey("authentication.User", on_delete=models.SET_NULL, null=True)
    closing_date = models.DateField(null=True, blank=True)

    class Meta:
        db_table = "job_posts"
        ordering = ["-created_at"]

    def __str__(self):
        return self.title


class Candidate(TenantModel):
    class Stage(models.TextChoices):
        APPLIED = "applied", "Applied"
        SCREENING = "screening", "Screening"
        INTERVIEW = "interview", "Interview"
        OFFER = "offer", "Offer"
        HIRED = "hired", "Hired"
        REJECTED = "rejected", "Rejected"
        WITHDRAWN = "withdrawn", "Withdrawn"

    job_post = models.ForeignKey(JobPost, on_delete=models.CASCADE, related_name="candidates")
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    email = models.EmailField()
    phone = models.CharField(max_length=20)
    resume = models.FileField(upload_to="resumes/")
    current_company = models.CharField(max_length=255, blank=True)
    current_designation = models.CharField(max_length=255, blank=True)
    experience_years = models.DecimalField(max_digits=4, decimal_places=1, default=0)
    current_ctc = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    expected_ctc = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    notice_period_days = models.PositiveSmallIntegerField(default=30)
    stage = models.CharField(max_length=20, choices=Stage.choices, default=Stage.APPLIED)
    source = models.CharField(max_length=100, blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        db_table = "candidates"
        unique_together = [["company", "job_post", "email"]]

    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}"


class Interview(TenantModel):
    class Type(models.TextChoices):
        PHONE = "phone", "Phone Screen"
        VIDEO = "video", "Video Call"
        IN_PERSON = "in_person", "In Person"
        TECHNICAL = "technical", "Technical"
        HR = "hr", "HR Round"

    class Status(models.TextChoices):
        SCHEDULED = "scheduled", "Scheduled"
        COMPLETED = "completed", "Completed"
        CANCELLED = "cancelled", "Cancelled"
        NO_SHOW = "no_show", "No Show"

    candidate = models.ForeignKey(Candidate, on_delete=models.CASCADE, related_name="interviews")
    interview_type = models.CharField(max_length=20, choices=Type.choices)
    scheduled_at = models.DateTimeField()
    duration_minutes = models.PositiveSmallIntegerField(default=60)
    interviewers = models.ManyToManyField("authentication.User", related_name="interviews")
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.SCHEDULED)
    feedback = models.TextField(blank=True)
    rating = models.PositiveSmallIntegerField(null=True, blank=True)
    meeting_link = models.URLField(blank=True)

    class Meta:
        db_table = "interviews"
        ordering = ["scheduled_at"]
