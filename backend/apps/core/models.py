import threading
from django.db import models

_thread_local = threading.local()


def get_current_company():
    return getattr(_thread_local, "company", None)


def set_current_company(company):
    _thread_local.company = company


class TenantManager(models.Manager):
    """Auto-filters querysets to the current tenant's company."""

    def get_queryset(self):
        qs = super().get_queryset()
        company = get_current_company()
        if company is not None:
            qs = qs.filter(company=company)
        return qs


class TenantModel(models.Model):
    """Abstract base model — every HRMS record belongs to a company."""

    company = models.ForeignKey(
        "companies.Company",
        on_delete=models.CASCADE,
        related_name="%(app_label)s_%(class)s_set",
        db_index=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = TenantManager()
    all_objects = models.Manager()  # bypass tenant filter when needed

    class Meta:
        abstract = True
