from django.contrib import admin
from .models import Document, DocumentShare, DocumentVersion

@admin.register(Document)
class DocumentAdmin(admin.ModelAdmin):
    list_display = ['name', 'category', 'user', 'status', 'created_at']
    list_filter = ['category', 'status', 'created_at']
    search_fields = ['name', 'user__username']
    readonly_fields = ['id', 'file_size', 'mime_type', 'created_at', 'updated_at']

@admin.register(DocumentShare)
class DocumentShareAdmin(admin.ModelAdmin):
    list_display = ['document', 'shared_by', 'shared_with', 'permissions', 'is_active']
    list_filter = ['permissions', 'is_active']

@admin.register(DocumentVersion)
class DocumentVersionAdmin(admin.ModelAdmin):
    list_display = ['document', 'version_number', 'created_by', 'created_at']
    list_filter = ['created_at']