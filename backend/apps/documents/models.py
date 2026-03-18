from django.db import models
from django.contrib.auth import get_user_model
import uuid
import os

User = get_user_model()

def document_upload_path(instance, filename):
    """Generate upload path for documents"""
    return f'documents/{instance.user.id}/{instance.category}/{filename}'

class Document(models.Model):
    CATEGORY_CHOICES = [
        ('invoice', 'Invoice'),
        ('receipt', 'Receipt'),
        ('gst_return', 'GST Return'),
        ('itr', 'Income Tax Return'),
        ('tds', 'TDS Certificate'),
        ('balance_sheet', 'Balance Sheet'),
        ('bank_statement', 'Bank Statement'),
        ('purchase_order', 'Purchase Order'),
        ('other', 'Other'),
    ]
    
    STATUS_CHOICES = [
        ('pending', 'Pending Processing'),
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='documents')
    name = models.CharField(max_length=255)
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES)
    file = models.FileField(upload_to=document_upload_path)
    file_size = models.BigIntegerField()
    mime_type = models.CharField(max_length=100)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    
    # AI Processing Results
    extracted_text = models.TextField(blank=True)
    extracted_data = models.JSONField(default=dict, blank=True)
    ai_summary = models.TextField(blank=True)
    confidence_score = models.FloatField(default=0.0)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    processed_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'documents'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.name} - {self.category}"
    
    @property
    def file_extension(self):
        return os.path.splitext(self.file.name)[1].lower()
    
    @property
    def is_image(self):
        return self.file_extension in ['.jpg', '.jpeg', '.png', '.gif', '.bmp']
    
    @property
    def is_pdf(self):
        return self.file_extension == '.pdf'

class DocumentShare(models.Model):
    document = models.ForeignKey(Document, on_delete=models.CASCADE, related_name='shares')
    shared_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='shared_documents')
    shared_with = models.ForeignKey(User, on_delete=models.CASCADE, related_name='received_documents')
    permissions = models.CharField(max_length=20, default='VIEW')  # VIEW, EDIT, DOWNLOAD
    expires_at = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'document_shares'
        unique_together = ['document', 'shared_with']

class DocumentVersion(models.Model):
    document = models.ForeignKey(Document, on_delete=models.CASCADE, related_name='versions')
    version_number = models.IntegerField()
    file = models.FileField(upload_to=document_upload_path)
    changes_summary = models.TextField(blank=True)
    created_by = models.ForeignKey(User, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'document_versions'
        unique_together = ['document', 'version_number']
        ordering = ['-version_number']