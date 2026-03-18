from django.contrib.auth.models import AbstractUser
from django.db import models
from cryptography.fernet import Fernet
import os

class User(AbstractUser):
    ROLE_CHOICES = [
        ('SME', 'Small & Medium Enterprise'),
        ('CA', 'Chartered Accountant'),
    ]
    
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default='SME')
    business_name = models.CharField(max_length=200, blank=True)
    gst_number = models.CharField(max_length=15, blank=True)
    phone = models.CharField(max_length=15, blank=True)
    address = models.TextField(blank=True)
    profile_picture = models.ImageField(upload_to='profiles/', blank=True, null=True)
    is_verified = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Additional client profile metadata (for SME users)
    profile_metadata = models.JSONField(default=dict, blank=True)
    
    # Encryption key for sensitive data
    encryption_key = models.BinaryField(blank=True, null=True)
    
    def save(self, *args, **kwargs):
        if not self.encryption_key:
            self.encryption_key = Fernet.generate_key()
        super().save(*args, **kwargs)
    
    def get_cipher(self):
        return Fernet(self.encryption_key)
    
    def encrypt_data(self, data):
        cipher = self.get_cipher()
        return cipher.encrypt(data.encode())
    
    def decrypt_data(self, encrypted_data):
        cipher = self.get_cipher()
        return cipher.decrypt(encrypted_data).decode()
    
    class Meta:
        db_table = 'users'

class AuditLog(models.Model):
    ACTION_CHOICES = [
        ('CREATE', 'Create'),
        ('UPDATE', 'Update'),
        ('DELETE', 'Delete'),
        ('VIEW', 'View'),
        ('LOGIN', 'Login'),
        ('LOGOUT', 'Logout'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='audit_logs')
    action = models.CharField(max_length=20, choices=ACTION_CHOICES)
    resource = models.CharField(max_length=100)  # e.g., 'transaction', 'document'
    resource_id = models.CharField(max_length=100, blank=True)
    details = models.JSONField(default=dict)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'audit_logs'
        ordering = ['-timestamp']

class ClientRelationship(models.Model):
    ca = models.ForeignKey(User, on_delete=models.CASCADE, related_name='clients')
    sme = models.ForeignKey(User, on_delete=models.CASCADE, related_name='chartered_accountants')
    is_active = models.BooleanField(default=True)
    access_level = models.CharField(max_length=20, default='FULL')  # FULL, LIMITED, READ_ONLY
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'client_relationships'
        unique_together = ['ca', 'sme']