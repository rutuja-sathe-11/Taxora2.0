from rest_framework import generics, status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from .models import Document, DocumentShare
from .serializers import (
    DocumentSerializer, DocumentUploadSerializer, DocumentShareSerializer
)
from apps.ai_services.tasks import process_document
from apps.users.models import AuditLog

class DocumentListCreateView(generics.ListCreateAPIView):
    serializer_class = DocumentSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return Document.objects.filter(user=self.request.user)
    
    def get_serializer_class(self):
        if self.request.method == 'POST':
            return DocumentUploadSerializer
        return DocumentSerializer
    
    def create(self, request, *args, **kwargs):
        upload_serializer = self.get_serializer(data=request.data)
        upload_serializer.is_valid(raise_exception=True)
        document = upload_serializer.save()

        # Log document upload
        AuditLog.objects.create(
            user=request.user,
            action='CREATE',
            resource='document',
            resource_id=str(document.id),
            details={'name': document.name, 'category': document.category}
        )

        # Process synchronously
        process_document(str(document.id))

        # Return full document details including extracted_data
        document.refresh_from_db()
        full_data = DocumentSerializer(document, context={'request': request}).data
        headers = self.get_success_headers(upload_serializer.data)
        return Response(full_data, status=status.HTTP_201_CREATED, headers=headers)

class DocumentDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = DocumentSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return Document.objects.filter(user=self.request.user)

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def share_document(request, document_id):
    """Share a document with another user"""
    document = get_object_or_404(Document, id=document_id, user=request.user)
    
    serializer = DocumentShareSerializer(data=request.data)
    if serializer.is_valid():
        share = serializer.save(
            document=document,
            shared_by=request.user
        )
        
        # Log document share
        AuditLog.objects.create(
            user=request.user,
            action='UPDATE',
            resource='document_share',
            resource_id=str(share.id),
            details={'document_id': str(document.id), 
                    'shared_with': str(share.shared_with.id)}
        )
        
        return Response(DocumentShareSerializer(share).data, 
                       status=status.HTTP_201_CREATED)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def shared_documents(request):
    """Get documents shared with the current user"""
    shares = DocumentShare.objects.filter(
        shared_with=request.user,
        is_active=True
    ).select_related('document', 'shared_by')
    
    serializer = DocumentShareSerializer(shares, many=True)
    return Response(serializer.data)

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def document_analytics(request):
    """Get document analytics for the user"""
    user_docs = Document.objects.filter(user=request.user)
    
    analytics = {
        'total_documents': user_docs.count(),
        'by_category': {},
        'by_status': {},
        'processing_stats': {
            'total_processed': user_docs.filter(status='completed').count(),
            'pending': user_docs.filter(status='pending').count(),
            'failed': user_docs.filter(status='failed').count(),
        }
    }
    
    # Documents by category
    for category, _ in Document.CATEGORY_CHOICES:
        count = user_docs.filter(category=category).count()
        if count > 0:
            analytics['by_category'][category] = count
    
    # Documents by status
    for status_val, _ in Document.STATUS_CHOICES:
        count = user_docs.filter(status=status_val).count()
        if count > 0:
            analytics['by_status'][status_val] = count
    
    return Response(analytics)