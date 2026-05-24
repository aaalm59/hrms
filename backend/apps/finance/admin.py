from django.contrib import admin
from .models import Budget, ExpenseCategory, Expense


class ExpenseInline(admin.TabularInline):
    model = Expense
    extra = 0
    fields = ["title", "category", "amount", "expense_date", "status"]
    readonly_fields = ["title", "amount", "expense_date"]
    show_change_link = True


@admin.register(Budget)
class BudgetAdmin(admin.ModelAdmin):
    list_display = ["name", "company", "budget_type", "department", "amount", "fiscal_year", "month", "quarter", "status"]
    list_filter = ["company", "budget_type", "status", "fiscal_year"]
    search_fields = ["name"]
    ordering = ["-fiscal_year", "name"]
    inlines = [ExpenseInline]


@admin.register(ExpenseCategory)
class ExpenseCategoryAdmin(admin.ModelAdmin):
    list_display = ["name", "code", "company"]
    list_filter = ["company"]
    search_fields = ["name", "code"]


@admin.register(Expense)
class ExpenseAdmin(admin.ModelAdmin):
    list_display = ["title", "company", "category", "amount", "currency", "expense_date", "status", "submitted_by", "approved_by"]
    list_filter = ["company", "status", "category", "currency"]
    search_fields = ["title", "submitted_by__email"]
    date_hierarchy = "expense_date"
    ordering = ["-expense_date"]
