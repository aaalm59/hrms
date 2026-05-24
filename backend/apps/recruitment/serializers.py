from rest_framework import serializers
from .models import JobPost, Candidate, Interview


class JobPostSerializer(serializers.ModelSerializer):
    candidate_count = serializers.SerializerMethodField()

    class Meta:
        model = JobPost
        exclude = ["company"]
        read_only_fields = ["id", "posted_by", "created_at"]

    def get_candidate_count(self, obj):
        return obj.candidates.count()


class CandidateSerializer(serializers.ModelSerializer):
    job_title = serializers.CharField(source="job_post.title", read_only=True)
    full_name = serializers.ReadOnlyField()
    applied_on = serializers.DateTimeField(source="created_at", read_only=True)
    company_name = serializers.CharField(source="company.name", read_only=True)

    class Meta:
        model = Candidate
        exclude = ["company"]
        read_only_fields = ["id", "created_at", "updated_at"]


class InterviewSerializer(serializers.ModelSerializer):
    candidate_name = serializers.CharField(source="candidate.full_name", read_only=True)

    class Meta:
        model = Interview
        exclude = ["company"]
        read_only_fields = ["id", "created_at"]
