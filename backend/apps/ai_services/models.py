from django.db import models
from django.contrib.auth import get_user_model
import uuid

User = get_user_model()

class AIModel(models.Model):
    name = models.CharField(max_length=100, unique=True)
    version = models.CharField(max_length=50)
    model_type = models.CharField(max_length=50)  # OCR, NER, CLASSIFICATION, etc.
    is_active = models.BooleanField(default=True)
    configuration = models.JSONField(default=dict)
    performance_metrics = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'ai_models'
    
    def __str__(self):
        return f"{self.name} v{self.version}"

class ChatSession(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='chat_sessions')
    title = models.CharField(max_length=200, blank=True)
    is_active = models.BooleanField(default=True)
    context_data = models.JSONField(default=dict)  # Store relevant documents, transactions
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'chat_sessions'
        ordering = ['-updated_at']
    
    def __str__(self):
        return self.title or f"Chat {self.id}"

class ChatMessage(models.Model):
    ROLE_CHOICES = [
        ('user', 'User'),
        ('assistant', 'Assistant'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    session = models.ForeignKey(ChatSession, on_delete=models.CASCADE, related_name='messages')
    role = models.CharField(max_length=20, choices=ROLE_CHOICES)
    content = models.TextField()
    metadata = models.JSONField(default=dict)  # Store AI model info, confidence, etc.
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'chat_messages'
        ordering = ['created_at']
    
    def __str__(self):
        return f"{self.role}: {self.content[:50]}..."

class AIInsight(models.Model):
    TYPE_CHOICES = [
        ('tax_saving', 'Tax Saving Opportunity'),
        ('gst_credit', 'GST Credit Optimization'),
        ('compliance_reminder', 'Compliance Reminder'),
        ('anomaly', 'Transaction Anomaly'),
        ('expense_optimization', 'Expense Optimization'),
        ('cash_flow', 'Cash Flow Insight'),
    ]
    
    PRIORITY_CHOICES = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='ai_insights')
    insight_type = models.CharField(max_length=30, choices=TYPE_CHOICES)
    title = models.CharField(max_length=200)
    description = models.TextField()
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES)
    action_required = models.BooleanField(default=False)
    is_read = models.BooleanField(default=False)
    is_dismissed = models.BooleanField(default=False)
    
    # Related objects that triggered this insight
    related_transactions = models.ManyToManyField('transactions.Transaction', blank=True)
    related_documents = models.ManyToManyField('documents.Document', blank=True)
    
    # AI confidence and source
    confidence_score = models.FloatField(default=0.0)
    ai_model = models.ForeignKey(AIModel, on_delete=models.SET_NULL, null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'ai_insights'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.title} ({self.priority})"