from django.contrib import admin
from .models import (
    ComplianceRule, ComplianceCalendar, TaxCalculator, 
    GSTReturn, ITRFiling, ComplianceScore
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