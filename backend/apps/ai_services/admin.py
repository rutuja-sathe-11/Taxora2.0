from django.contrib import admin
from .models import AIModel, ChatSession, ChatMessage, AIInsight

@admin.register(AIModel)
class AIModelAdmin(admin.ModelAdmin):
    list_display = ['name', 'version', 'model_type', 'is_active']
    list_filter = ['model_type', 'is_active']
    search_fields = ['name']

@admin.register(ChatSession)
class ChatSessionAdmin(admin.ModelAdmin):
    list_display = ['title', 'user', 'is_active', 'created_at']
    list_filter = ['is_active', 'created_at']
    search_fields = ['title', 'user__username']

@admin.register(ChatMessage)
class ChatMessageAdmin(admin.ModelAdmin):
    list_display = ['session', 'role', 'content_preview', 'created_at']
    list_filter = ['role', 'created_at']
    
    def content_preview(self, obj):
        return obj.content[:50] + "..." if len(obj.content) > 50 else obj.content

@admin.register(AIInsight)
class AIInsightAdmin(admin.ModelAdmin):
    list_display = ['title', 'user', 'insight_type', 'priority', 'is_read', 'created_at']
    list_filter = ['insight_type', 'priority', 'is_read', 'is_dismissed']
    search_fields = ['title', 'user__username']