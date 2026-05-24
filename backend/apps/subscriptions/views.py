from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from apps.core.permissions import IsSuperAdmin
from .models import Plan, Subscription, Invoice
from .serializers import PlanSerializer, SubscriptionSerializer, InvoiceSerializer


class PlanViewSet(viewsets.ModelViewSet):
    queryset = Plan.objects.filter(is_active=True).order_by("price_monthly", "id")
    serializer_class = PlanSerializer

    def get_permissions(self):
        if self.action in ["list", "retrieve"]:
            return []
        return [IsSuperAdmin()]


class SubscriptionViewSet(viewsets.ModelViewSet):
    queryset = Subscription.objects.select_related("company", "plan").order_by("-created_at", "id")
    serializer_class = SubscriptionSerializer
    permission_classes = [IsSuperAdmin]

    @action(detail=True, methods=["post"])
    def cancel(self, request, pk=None):
        sub = self.get_object()
        sub.status = Subscription.Status.CANCELLED
        sub.save()
        return Response({"detail": "Subscription cancelled."})


class InvoiceViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Invoice.objects.select_related("subscription__company").order_by("-created_at", "id")
    serializer_class = InvoiceSerializer
    permission_classes = [IsSuperAdmin]
