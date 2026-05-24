from django.contrib import admin
from .models import Plan, Subscription, Invoice


class InvoiceInline(admin.TabularInline):
    model = Invoice
    extra = 0
    fields = ["invoice_number", "amount", "status", "due_date", "paid_at", "payment_reference"]
    readonly_fields = ["invoice_number", "created_at"]
    ordering = ["-due_date"]


@admin.register(Plan)
class PlanAdmin(admin.ModelAdmin):
    list_display = ["name", "tier", "price_monthly", "price_yearly", "max_employees", "max_storage_gb", "is_active"]
    list_filter = ["tier", "is_active"]
    search_fields = ["name"]
    ordering = ["price_monthly"]


@admin.register(Subscription)
class SubscriptionAdmin(admin.ModelAdmin):
    list_display = ["company", "plan", "status", "billing_cycle", "start_date", "end_date", "trial_end_date", "amount_paid"]
    list_filter = ["status", "billing_cycle", "plan"]
    search_fields = ["company__name"]
    date_hierarchy = "start_date"
    ordering = ["-created_at"]
    inlines = [InvoiceInline]


@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    list_display = ["invoice_number", "subscription", "amount", "status", "due_date", "paid_at", "payment_reference"]
    list_filter = ["status"]
    search_fields = ["invoice_number", "subscription__company__name", "payment_reference"]
    date_hierarchy = "due_date"
    ordering = ["-due_date"]
