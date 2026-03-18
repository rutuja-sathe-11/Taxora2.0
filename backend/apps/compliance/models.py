from django.db import models
from django.contrib.auth import get_user_model
import uuid

User = get_user_model()

class ComplianceRule(models.Model):
    RULE_TYPES = [
        ('gst_filing', 'GST Filing'),
        ('tds_deduction', 'TDS Deduction'),
        ('itr_filing', 'ITR Filing'),
        ('audit_requirement', 'Audit Requirement'),
        ('documentation', 'Documentation'),
    ]
    
    name = models.CharField(max_length=200)
    rule_type = models.CharField(max_length=30, choices=RULE_TYPES)
    description = models.TextField()
    conditions = models.JSONField(default=dict)  # Store rule conditions
    consequences = models.TextField()  # What happens if not followed
    due_period = models.CharField(max_length=50)  # monthly, quarterly, yearly
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'compliance_rules'
    
    def __str__(self):
        return self.name

class ComplianceCalendar(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='compliance_items')
    rule = models.ForeignKey(ComplianceRule, on_delete=models.CASCADE)
    due_date = models.DateField()
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    is_completed = models.BooleanField(default=False)
    completed_at = models.DateTimeField(null=True, blank=True)
    reminder_sent = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'compliance_calendar'
        ordering = ['due_date']
        unique_together = ['user', 'rule', 'due_date']
    
    def __str__(self):
        return f"{self.title} - {self.due_date}"

class TaxCalculator(models.Model):
    """Store tax calculation templates and rates"""
    CALCULATION_TYPES = [
        ('income_tax', 'Income Tax'),
        ('gst', 'GST'),
        ('tds', 'TDS'),
        ('professional_tax', 'Professional Tax'),
    ]
    
    name = models.CharField(max_length=100)
    calculation_type = models.CharField(max_length=30, choices=CALCULATION_TYPES)
    applicable_year = models.CharField(max_length=10)  # FY 2024-25
    tax_slabs = models.JSONField(default=list)
    deductions = models.JSONField(default=list)
    exemptions = models.JSONField(default=list)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'tax_calculators'
    
    def __str__(self):
        return f"{self.name} ({self.applicable_year})"

class GSTReturn(models.Model):
    """GST return filing tracking"""
    RETURN_TYPES = [
        ('GSTR1', 'GSTR-1'),
        ('GSTR3B', 'GSTR-3B'),
        ('GSTR9', 'GSTR-9'),
    ]
    
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('filed', 'Filed'),
        ('late', 'Filed Late'),
        ('not_filed', 'Not Filed'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='gst_returns')
    return_type = models.CharField(max_length=10, choices=RETURN_TYPES)
    period = models.CharField(max_length=20)  # MM-YYYY
    due_date = models.DateField()
    filing_date = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    
    # GST amounts
    total_taxable_value = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    total_tax_payable = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    total_input_credit = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    net_tax_payable = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    
    # Filing details
    acknowledgment_number = models.CharField(max_length=100, blank=True)
    reference_number = models.CharField(max_length=100, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'gst_returns'
        unique_together = ['user', 'return_type', 'period']
    
    def __str__(self):
        return f"{self.return_type} - {self.period}"

class ITRFiling(models.Model):
    """Income Tax Return filing tracking"""
    ITR_FORMS = [
        ('ITR1', 'ITR-1 (Sahaj)'),
        ('ITR2', 'ITR-2'),
        ('ITR3', 'ITR-3'),
        ('ITR4', 'ITR-4 (Sugam)'),
    ]
    
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('filed', 'Filed'),
        ('processed', 'Processed'),
        ('refund', 'Refund Issued'),
        ('demand', 'Tax Demand'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='itr_filings')
    assessment_year = models.CharField(max_length=10)  # AY 2024-25
    itr_form = models.CharField(max_length=10, choices=ITR_FORMS)
    filing_date = models.DateField(null=True, blank=True)
    due_date = models.DateField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    
    # Income details
    gross_total_income = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    total_deductions = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    taxable_income = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    tax_computed = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    tax_paid = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    refund_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    
    # Filing details
    acknowledgment_number = models.CharField(max_length=100, blank=True)
    processing_date = models.DateField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'itr_filings'
        unique_together = ['user', 'assessment_year']
    
    def __str__(self):
        return f"{self.itr_form} - {self.assessment_year}"

class ComplianceScore(models.Model):
    """Track user's compliance score"""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='compliance_score')
    overall_score = models.IntegerField(default=100)  # Out of 100
    gst_score = models.IntegerField(default=100)
    itr_score = models.IntegerField(default=100)
    tds_score = models.IntegerField(default=100)
    documentation_score = models.IntegerField(default=100)
    
    # Factors affecting score
    late_filings = models.IntegerField(default=0)
    missing_documents = models.IntegerField(default=0)
    compliance_issues = models.IntegerField(default=0)
    
    last_calculated = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'compliance_scores'
    
    def calculate_score(self):
        """Recalculate compliance score based on various factors"""
        base_score = 100
        
        # Deduct points for late filings
        base_score -= min(self.late_filings * 5, 30)
        
        # Deduct points for missing documents
        base_score -= min(self.missing_documents * 3, 20)
        
        # Deduct points for compliance issues
        base_score -= min(self.compliance_issues * 10, 40)
        
        self.overall_score = max(base_score, 0)
        self.save()
        
        return self.overall_score