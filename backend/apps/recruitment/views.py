from rest_framework import viewsets, filters
from django_filters.rest_framework import DjangoFilterBackend

from apps.core.permissions import IsHRAdmin
from .models import JobPost, Candidate, Interview
from .serializers import JobPostSerializer, CandidateSerializer, InterviewSerializer


class JobPostViewSet(viewsets.ModelViewSet):
    serializer_class = JobPostSerializer
    permission_classes = [IsHRAdmin]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ["status", "department", "employment_type"]
    search_fields = ["title", "description"]

    def get_queryset(self):
        user = self.request.user
        if user.is_super_admin:
            company_id = self.request.query_params.get("company_id")
            qs = JobPost.objects.all()
            return qs.filter(company_id=company_id) if company_id else qs
        return JobPost.objects.filter(company=user.company)

    def perform_create(self, serializer):
        serializer.save(company=self.request.user.company, posted_by=self.request.user)


class CandidateViewSet(viewsets.ModelViewSet):
    serializer_class = CandidateSerializer
    permission_classes = [IsHRAdmin]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ["stage", "job_post"]
    search_fields = ["first_name", "last_name", "email"]

    def get_queryset(self):
        user = self.request.user
        if user.is_super_admin:
            company_id = self.request.query_params.get("company_id")
            qs = Candidate.objects.all()
            return qs.filter(company_id=company_id) if company_id else qs
        return Candidate.objects.filter(company=user.company)

    def perform_create(self, serializer):
        serializer.save(company=self.request.user.company)


class InterviewViewSet(viewsets.ModelViewSet):
    serializer_class = InterviewSerializer
    permission_classes = [IsHRAdmin]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ["status", "interview_type"]
    ordering_fields = ["scheduled_at"]

    def get_queryset(self):
        user = self.request.user
        if user.is_super_admin:
            company_id = self.request.query_params.get("company_id")
            qs = Interview.objects.all()
            return qs.filter(company_id=company_id) if company_id else qs
        return Interview.objects.filter(company=user.company)

    def perform_create(self, serializer):
        serializer.save(company=self.request.user.company)
