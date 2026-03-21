from django.contrib import admin
from .models import (
    ComplianceRule, ComplianceCalendar, TaxCalculator, 
    GSTReturn, ITRFiling, ComplianceScore,
    Client, Transaction, TDSRecord, ITRRecord,
    GSTRecord, Report, Message, Compliance, Notice
)

@admin.register(ComplianceRule)
class ComplianceRuleAdmin(admin.ModelAdmin):
    list_display = ['name', 'rule_type', 'due_period', 'is_active']
    list_filter = ['rule_type', 'is_active']

@admin.register(ComplianceCalendar)
class ComplianceCalendarAdmin(admin.ModelAdmin):
    list_display = ['title', 'user', 'due_date', 'is_completed']
    list_filter = ['is_completed', 'due_date']
    search_fields = ['title', 'user__username']

@admin.register(GSTReturn)
class GSTReturnAdmin(admin.ModelAdmin):
    list_display = ['user', 'return_type', 'period', 'due_date', 'status']
    list_filter = ['return_type', 'status']

@admin.register(ITRFiling)
class ITRFilingAdmin(admin.ModelAdmin):
    list_display = ['user', 'assessment_year', 'itr_form', 'status']
    list_filter = ['itr_form', 'status']

@admin.register(ComplianceScore)
class ComplianceScoreAdmin(admin.ModelAdmin):
    list_display = ['user', 'overall_score', 'last_calculated']
    readonly_fields = ['last_calculated']


@admin.register(Client)
class ClientAdmin(admin.ModelAdmin):
    list_display = ['name', 'email', 'phone', 'pan', 'gstin', 'user']
    search_fields = ['name', 'email', 'pan', 'gstin']
    list_filter = ['created_at']


@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display = ['client', 'type', 'amount', 'gst_rate', 'date']
    list_filter = ['type', 'date']
    search_fields = ['client__name', 'description']


@admin.register(TDSRecord)
class TDSRecordAdmin(admin.ModelAdmin):
    list_display = ['client', 'payment_type', 'section', 'pan_available', 'tds_rate', 'amount', 'tds_deducted', 'date']
    list_filter = ['payment_type', 'section', 'pan_available', 'date']


@admin.register(ITRRecord)
class ITRRecordAdmin(admin.ModelAdmin):
    list_display = ['client', 'assessment_year', 'taxable_income', 'tax_payable', 'status']
    list_filter = ['status', 'assessment_year']


@admin.register(GSTRecord)
class GSTRecordAdmin(admin.ModelAdmin):
    list_display = ['client', 'period', 'output_tax', 'input_tax', 'net_tax']
    list_filter = ['period']


@admin.register(Report)
class ReportAdmin(admin.ModelAdmin):
    list_display = ['client', 'report_type', 'created_at']
    list_filter = ['report_type', 'created_at']


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ['client', 'sender', 'report', 'timestamp']
    search_fields = ['client__name', 'message_text']


@admin.register(Compliance)
class ComplianceAdmin(admin.ModelAdmin):
    list_display = ['client', 'type', 'due_date', 'status']
    list_filter = ['type', 'status', 'due_date']


@admin.register(Notice)
class NoticeAdmin(admin.ModelAdmin):
    list_display = ['client', 'type', 'status', 'created_at']
    list_filter = ['type', 'status', 'created_at']