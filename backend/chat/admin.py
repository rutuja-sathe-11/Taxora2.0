from django.contrib import admin
from .models import Conversation, Message


@admin.register(Conversation)
class ConversationAdmin(admin.ModelAdmin):
    list_display = ['id', 'ca', 'sme', 'status', 'created_at', 'last_message_at']
    list_filter = ['status', 'created_at']
    search_fields = ['ca__email', 'sme__email', 'ca__business_name', 'sme__business_name']
    readonly_fields = ['id', 'created_at', 'updated_at']
    ordering = ['-last_message_at', '-created_at']
    
    fieldsets = (
        ('Participants', {
            'fields': ('ca', 'sme')
        }),
        ('Status', {
            'fields': ('status',)
        }),
        ('Metadata', {
            'fields': ('unread_by_ca', 'unread_by_sme')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at', 'last_message_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ['id', 'conversation', 'sender', 'content_preview', 'is_read', 'created_at']
    list_filter = ['is_read', 'created_at']
    search_fields = ['conversation__id', 'sender__email', 'content']
    readonly_fields = ['id', 'created_at', 'updated_at']
    ordering = ['-created_at']
    
    fieldsets = (
        ('Message', {
            'fields': ('conversation', 'sender', 'content')
        }),
        ('Status', {
            'fields': ('is_read', 'read_at')
        }),
        ('Attachment', {
            'fields': ('attachment', 'attachment_type'),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def content_preview(self, obj):
        return obj.content[:50] + '...' if len(obj.content) > 50 else obj.content
    content_preview.short_description = 'Content'
