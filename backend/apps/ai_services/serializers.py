from rest_framework import serializers
from .models import ChatSession, ChatMessage, AIInsight, AIModel

class ChatMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChatMessage
        fields = ['id', 'role', 'content', 'metadata', 'created_at']
        read_only_fields = ['id', 'created_at']

class ChatSessionSerializer(serializers.ModelSerializer):
    messages = ChatMessageSerializer(many=True, read_only=True)
    message_count = serializers.IntegerField(source='messages.count', read_only=True)
    
    class Meta:
        model = ChatSession
        fields = ['id', 'title', 'is_active', 'context_data', 'messages', 
                 'message_count', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']

class AIInsightSerializer(serializers.ModelSerializer):
    related_transaction_count = serializers.IntegerField(
        source='related_transactions.count', read_only=True
    )
    related_document_count = serializers.IntegerField(
        source='related_documents.count', read_only=True
    )
    ai_model_name = serializers.CharField(source='ai_model.name', read_only=True)
    
    class Meta:
        model = AIInsight
        fields = ['id', 'insight_type', 'title', 'description', 'priority', 
                 'action_required', 'is_read', 'is_dismissed', 
                 'related_transaction_count', 'related_document_count',
                 'confidence_score', 'ai_model_name', 'created_at', 'expires_at']
        read_only_fields = ['id', 'confidence_score', 'ai_model_name', 'created_at']

class AIModelSerializer(serializers.ModelSerializer):
    class Meta:
        model = AIModel
        fields = '__all__'
        read_only_fields = ['id', 'created_at']

class ChatCreateSerializer(serializers.Serializer):
    message = serializers.CharField(max_length=2000)
    session_id = serializers.UUIDField(required=False)
    context_documents = serializers.ListField(
        child=serializers.UUIDField(), required=False
    )
    context_transactions = serializers.ListField(
        child=serializers.UUIDField(), required=False
    )