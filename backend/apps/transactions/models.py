from django.db import models
from django.contrib.auth import get_user_model
from apps.documents.models import Document
import uuid

User = get_user_model()

class Transaction(models.Model):
    TYPE_CHOICES = [
        ('income', 'Income'),
        ('expense', 'Expense'),
    ]
    
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('flagged', 'Flagged'),
        ('rejected', 'Rejected'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='transactions')
    date = models.DateField()
    description = models.CharField(max_length=255)
    amount = models.DecimalField(max_digits=15, decimal_places=2)
    type = models.CharField(max_length=10, choices=TYPE_CHOICES)
    category = models.CharField(max_length=50)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='pending')
    
    # References
    invoice_number = models.CharField(max_length=100, blank=True)
    vendor_name = models.CharField(max_length=200, blank=True)
    gst_number = models.CharField(max_length=15, blank=True)
    
    # Tax Information
    cgst_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    sgst_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    igst_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    tds_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    
    # AI Analysis
    ai_analysis = models.TextField(blank=True)
    confidence_score = models.FloatField(default=0.0)
    anomaly_flags = models.JSONField(default=list, blank=True)
    
    # Attachments
    documents = models.ManyToManyField(Document, blank=True, related_name='linked_transactions')
    
    # Approval workflow
    reviewed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='reviewed_transactions')
    reviewed_at = models.DateTimeField(null=True, blank=True)
    review_notes = models.TextField(blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'transactions'
        ordering = ['-date', '-created_at']
    
    def __str__(self):
        return f"{self.description} - {self.amount}"
    
    @property
    def total_tax_amount(self):
        return self.cgst_amount + self.sgst_amount + self.igst_amount
    
    @property
    def net_amount(self):
        return self.amount - self.tds_amount

class TransactionCategory(models.Model):
    name = models.CharField(max_length=50, unique=True)
    description = models.TextField(blank=True)
    is_expense_category = models.BooleanField(default=True)
    is_active = models.BooleanField(default=True)
    gst_applicable = models.BooleanField(default=False)
    default_gst_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    
    class Meta:
        db_table = 'transaction_categories'
        verbose_name_plural = 'Transaction Categories'
    
    def __str__(self):
        return self.name

class RecurringTransaction(models.Model):
    FREQUENCY_CHOICES = [
        ('weekly', 'Weekly'),
        ('monthly', 'Monthly'),
        ('quarterly', 'Quarterly'),
        ('yearly', 'Yearly'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='recurring_transactions')
    template_transaction = models.ForeignKey(Transaction, on_delete=models.CASCADE)
    frequency = models.CharField(max_length=20, choices=FREQUENCY_CHOICES)
    next_due_date = models.DateField()
    end_date = models.DateField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'recurring_transactions'

class BankAccount(models.Model):
    ACCOUNT_TYPE_CHOICES = [
        ('savings', 'Savings Account'),
        ('current', 'Current Account'),
        ('od', 'Overdraft Account'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='bank_accounts')
    account_name = models.CharField(max_length=100)
    account_number = models.CharField(max_length=20)
    bank_name = models.CharField(max_length=100)
    ifsc_code = models.CharField(max_length=11)
    account_type = models.CharField(max_length=20, choices=ACCOUNT_TYPE_CHOICES)
    current_balance = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    is_primary = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'bank_accounts'
    
    def __str__(self):
        return f"{self.bank_name} - {self.account_number[-4:]}"