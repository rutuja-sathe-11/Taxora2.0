from django.db import models
from django.contrib.auth import get_user_model
import uuid

User = get_user_model()

class Conversation(models.Model):
    """
    Represents a chat conversation between a CA and SME.
    Created when an SME sends a connection request to a CA.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    ca = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        related_name='conversations_as_ca',
        limit_choices_to={'role': 'CA'}
    )
    sme = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        related_name='conversations_as_sme',
        limit_choices_to={'role': 'SME'}
    )
    
    # Status of the relationship
    STATUS_CHOICES = [
        ('pending', 'Pending Request'),
        ('accepted', 'Accepted'),
        ('rejected', 'Rejected'),
        ('active', 'Active'),
        ('closed', 'Closed'),
    ]
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    last_message_at = models.DateTimeField(null=True, blank=True)
    
    # Unread message counts
    unread_by_ca = models.IntegerField(default=0)
    unread_by_sme = models.IntegerField(default=0)
    
    class Meta:
        db_table = 'conversations'
        unique_together = ['ca', 'sme']
        ordering = ['-last_message_at', '-updated_at']
        indexes = [
            models.Index(fields=['ca', 'status']),
            models.Index(fields=['sme', 'status']),
            models.Index(fields=['-last_message_at']),
        ]
    
    def __str__(self):
        return f"Chat: {self.sme.business_name or self.sme.username} - {self.ca.business_name or self.ca.username}"
    
    @property
    def is_active(self):
        return self.status in ['active', 'accepted']


class Message(models.Model):
    """
    Represents a single message in a conversation.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    conversation = models.ForeignKey(
        Conversation, 
        on_delete=models.CASCADE, 
        related_name='messages'
    )
    sender = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        related_name='sent_messages'
    )
    
    # Message content
    content = models.TextField()
    
    # Status
    is_read = models.BooleanField(default=False)
    read_at = models.DateTimeField(null=True, blank=True)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Optional attachment support
    attachment = models.FileField(upload_to='chat_attachments/%Y/%m/%d/', null=True, blank=True)
    attachment_type = models.CharField(
        max_length=20, 
        choices=[
            ('document', 'Document'),
            ('invoice', 'Invoice'),
            ('receipt', 'Receipt'),
            ('image', 'Image'),
            ('other', 'Other'),
        ],
        null=True,
        blank=True
    )
    
    class Meta:
        db_table = 'messages'
        ordering = ['created_at']
        indexes = [
            models.Index(fields=['conversation', 'created_at']),
            models.Index(fields=['sender']),
            models.Index(fields=['is_read']),
        ]
    
    def __str__(self):
        return f"Message from {self.sender.username} in {self.conversation}"
    
    def mark_as_read(self):
        """Mark message as read"""
        if not self.is_read:
            self.is_read = True
            self.read_at = models.functions.Now()
            self.save(update_fields=['is_read', 'read_at'])
