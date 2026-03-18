from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, AuditLog, ClientRelationship

@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ['username', 'email', 'role', 'business_name', 'is_verified', 'created_at']
    list_filter = ['role', 'is_verified', 'is_active']
    search_fields = ['username', 'email', 'business_name']
    
    fieldsets = BaseUserAdmin.fieldsets + (
        ('Business Info', {'fields': ('role', 'business_name', 'gst_number', 'phone', 'address')}),
        ('Verification', {'fields': ('is_verified', 'profile_picture')}),
    )

@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ['user', 'action', 'resource', 'timestamp']
    list_filter = ['action', 'resource', 'timestamp']
    search_fields = ['user__username', 'resource']
    readonly_fields = ['timestamp']

@admin.register(ClientRelationship)
class ClientRelationshipAdmin(admin.ModelAdmin):
    list_display = ['ca', 'sme', 'is_active', 'access_level', 'created_at']
    list_filter = ['is_active', 'access_level']
    search_fields = ['ca__username', 'sme__username']