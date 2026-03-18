from django.contrib import admin
from .models import Transaction, TransactionCategory, RecurringTransaction, BankAccount

@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display = ['description', 'amount', 'type', 'category', 'user', 'status', 'date']
    list_filter = ['type', 'status', 'category', 'date']
    search_fields = ['description', 'vendor_name', 'invoice_number']
    readonly_fields = ['id', 'created_at', 'updated_at']

@admin.register(TransactionCategory)
class TransactionCategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'is_expense_category', 'gst_applicable', 'is_active']
    list_filter = ['is_expense_category', 'gst_applicable', 'is_active']

@admin.register(BankAccount)
class BankAccountAdmin(admin.ModelAdmin):
    list_display = ['account_name', 'bank_name', 'user', 'account_type', 'is_primary']
    list_filter = ['account_type', 'is_primary', 'is_active']