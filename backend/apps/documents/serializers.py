from rest_framework import serializers
from .models import Document, DocumentShare, DocumentVersion

class DocumentSerializer(serializers.ModelSerializer):
    file_url = serializers.SerializerMethodField()
    owner_name = serializers.CharField(source='user.get_full_name', read_only=True)
    
    class Meta:
        model = Document
        fields = ['id', 'name', 'category', 'file', 'file_url', 'file_size', 
                 'mime_type', 'status', 'extracted_text', 'extracted_data', 
                 'ai_summary', 'confidence_score', 'owner_name', 'created_at', 
                 'updated_at', 'processed_at']
        read_only_fields = ['id', 'file_size', 'mime_type', 'status', 
                           'extracted_text', 'extracted_data', 'ai_summary', 
                           'confidence_score', 'processed_at']
    
    def get_file_url(self, obj):
        request = self.context.get('request')
        if obj.file and request:
            return request.build_absolute_uri(obj.file.url)
        return None

class DocumentUploadSerializer(serializers.ModelSerializer):
    class Meta:
        model = Document
        fields = ['name', 'category', 'file']
    
    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        validated_data['file_size'] = validated_data['file'].size
        validated_data['mime_type'] = validated_data['file'].content_type or 'application/octet-stream'
        return super().create(validated_data)

class DocumentShareSerializer(serializers.ModelSerializer):
    shared_by_name = serializers.CharField(source='shared_by.get_full_name', read_only=True)
    shared_with_name = serializers.CharField(source='shared_with.get_full_name', read_only=True)
    document_name = serializers.CharField(source='document.name', read_only=True)
    
    class Meta:
        model = DocumentShare
        fields = ['id', 'document', 'document_name', 'shared_by_name', 
                 'shared_with_name', 'permissions', 'expires_at', 'is_active', 
                 'created_at']
        read_only_fields = ['id', 'shared_by_name', 'created_at']

class DocumentVersionSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    
    class Meta:
        model = DocumentVersion
        fields = ['id', 'version_number', 'file', 'changes_summary', 
                 'created_by_name', 'created_at']
        read_only_fields = ['id', 'version_number', 'created_by_name', 'created_at']