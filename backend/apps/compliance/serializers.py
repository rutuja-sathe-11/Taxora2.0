from rest_framework import serializers
from .models import (
    ComplianceRule, ComplianceCalendar, TaxCalculator, 
    GSTReturn, ITRFiling, ComplianceScore
)

class ComplianceRuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = ComplianceRule
        fields = '__all__'

class ComplianceCalendarSerializer(serializers.ModelSerializer):
    rule_name = serializers.CharField(source='rule.name', read_only=True)
    rule_type = serializers.CharField(source='rule.rule_type', read_only=True)
    days_until_due = serializers.SerializerMethodField()
    
    class Meta:
        model = ComplianceCalendar
        fields = ['id', 'rule', 'rule_name', 'rule_type', 'due_date', 'title', 
                 'description', 'is_completed', 'completed_at', 'days_until_due', 
                 'created_at']
        read_only_fields = ['id', 'created_at']
    
    def get_days_until_due(self, obj):
        from datetime import date
        if obj.due_date:
            delta = obj.due_date - date.today()
            return delta.days
        return None

class TaxCalculatorSerializer(serializers.ModelSerializer):
    class Meta:
        model = TaxCalculator
        fields = '__all__'

class GSTReturnSerializer(serializers.ModelSerializer):
    is_overdue = serializers.SerializerMethodField()
    
    class Meta:
        model = GSTReturn
        fields = ['id', 'return_type', 'period', 'due_date', 'filing_date', 'status',
                 'total_taxable_value', 'total_tax_payable', 'total_input_credit',
                 'net_tax_payable', 'acknowledgment_number', 'is_overdue',
                 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_is_overdue(self, obj):
        from datetime import date
        return obj.due_date < date.today() and obj.status in ['draft', 'not_filed']

class ITRFilingSerializer(serializers.ModelSerializer):
    is_overdue = serializers.SerializerMethodField()
    
    class Meta:
        model = ITRFiling
        fields = ['id', 'assessment_year', 'itr_form', 'filing_date', 'due_date', 'status',
                 'gross_total_income', 'total_deductions', 'taxable_income', 
                 'tax_computed', 'tax_paid', 'refund_amount', 'acknowledgment_number',
                 'is_overdue', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_is_overdue(self, obj):
        from datetime import date
        return obj.due_date < date.today() and obj.status == 'draft'

class ComplianceScoreSerializer(serializers.ModelSerializer):
    score_level = serializers.SerializerMethodField()
    
    class Meta:
        model = ComplianceScore
        fields = ['overall_score', 'gst_score', 'itr_score', 'tds_score', 
                 'documentation_score', 'late_filings', 'missing_documents', 
                 'compliance_issues', 'score_level', 'last_calculated']
        read_only_fields = ['last_calculated']
    
    def get_score_level(self, obj):
        if obj.overall_score >= 90:
            return 'Excellent'
        elif obj.overall_score >= 75:
            return 'Good'
        elif obj.overall_score >= 60:
            return 'Average'
        else:
            return 'Needs Improvement'

class TaxCalculationSerializer(serializers.Serializer):
    """For tax calculation requests"""
    income_amount = serializers.DecimalField(max_digits=15, decimal_places=2)
    calculation_type = serializers.CharField(max_length=30)
    assessment_year = serializers.CharField(max_length=10, required=False)
    deductions_80c = serializers.DecimalField(max_digits=10, decimal_places=2, default=0)
    deductions_80d = serializers.DecimalField(max_digits=10, decimal_places=2, default=0)
    other_deductions = serializers.DecimalField(max_digits=10, decimal_places=2, default=0)
    
class GSTCalculationSerializer(serializers.Serializer):
    """For GST calculation requests"""
    taxable_amount = serializers.DecimalField(max_digits=15, decimal_places=2)
    gst_rate = serializers.DecimalField(max_digits=5, decimal_places=2)
    state_code = serializers.CharField(max_length=2, required=False)
    transaction_type = serializers.ChoiceField(choices=['intrastate', 'interstate'])