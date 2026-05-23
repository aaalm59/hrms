import django_filters
from .models import Employee


class EmployeeFilter(django_filters.FilterSet):
    date_of_joining_from = django_filters.DateFilter(field_name="date_of_joining", lookup_expr="gte")
    date_of_joining_to = django_filters.DateFilter(field_name="date_of_joining", lookup_expr="lte")

    class Meta:
        model = Employee
        fields = ["department", "designation", "status", "employment_type", "gender"]
