from rest_framework import generics, status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from .models import ChatSession, ChatMessage, AIInsight
from .serializers import (
    ChatSessionSerializer, ChatMessageSerializer, AIInsightSerializer,
    ChatCreateSerializer
)
from .ai_utils import ai_advisor
from apps.users.models import AuditLog
from apps.transactions.models import Transaction
from apps.documents.models import Document
import uuid

class ChatSessionListView(generics.ListCreateAPIView):
    serializer_class = ChatSessionSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return ChatSession.objects.filter(user=self.request.user)
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

class ChatSessionDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ChatSessionSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return ChatSession.objects.filter(user=self.request.user)

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def chat_with_ai(request):
    """Chat with AI tax advisor"""
    serializer = ChatCreateSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    user = request.user
    message_content = serializer.validated_data['message']
    session_id = serializer.validated_data.get('session_id')
    
    # Get or create chat session
    if session_id:
        try:
            session = ChatSession.objects.get(id=session_id, user=user)
        except ChatSession.DoesNotExist:
            session = ChatSession.objects.create(
                user=user,
                title=message_content[:50] + "..." if len(message_content) > 50 else message_content
            )
    else:
        session = ChatSession.objects.create(
            user=user,
            title=message_content[:50] + "..." if len(message_content) > 50 else message_content
        )
    
    # Create user message
    user_message = ChatMessage.objects.create(
        session=session,
        role='user',
        content=message_content
    )
    
    # Prepare context
    context = {
        'user_info': {
            'name': user.get_full_name(),
            'business_name': user.business_name,
            'role': user.role
        }
    }
    
    # Add context documents and transactions if provided
    context_doc_ids = serializer.validated_data.get('context_documents', [])
    context_txn_ids = serializer.validated_data.get('context_transactions', [])
    
    if context_doc_ids:
        documents = Document.objects.filter(
            id__in=context_doc_ids, user=user
        ).values('name', 'category', 'ai_summary')
        context['documents'] = list(documents)
    
    if context_txn_ids:
        transactions = Transaction.objects.filter(
            id__in=context_txn_ids, user=user
        ).values('description', 'amount', 'type', 'category')
        context['transactions'] = list(transactions)
    
    # Get AI response
    try:
        ai_response = ai_advisor.get_tax_advice(message_content, context)
        
        # Create AI message
        ai_message = ChatMessage.objects.create(
            session=session,
            role='assistant',
            content=ai_response,
            metadata={'context_used': bool(context_doc_ids or context_txn_ids)}
        )
        
        # Update session timestamp
        session.save()  # This updates the updated_at field
        
        # Log the interaction
        AuditLog.objects.create(
            user=user,
            action='CREATE',
            resource='ai_chat',
            resource_id=str(session.id),
            details={'message_length': len(message_content)}
        )
        
        return Response({
            'session_id': str(session.id),
            'user_message': ChatMessageSerializer(user_message).data,
            'ai_response': ChatMessageSerializer(ai_message).data
        })
    
    except Exception as e:
        return Response(
            {'error': 'Failed to get AI response. Please try again.'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

class AIInsightListView(generics.ListAPIView):
    serializer_class = AIInsightSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        queryset = AIInsight.objects.filter(user=self.request.user)
        
        # Filter options
        insight_type = self.request.query_params.get('type')
        priority = self.request.query_params.get('priority')
        is_read = self.request.query_params.get('is_read')
        
        if insight_type:
            queryset = queryset.filter(insight_type=insight_type)
        
        if priority:
            queryset = queryset.filter(priority=priority)
        
        if is_read is not None:
            queryset = queryset.filter(is_read=is_read.lower() == 'true')
        
        return queryset.filter(is_dismissed=False)

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def mark_insight_read(request, insight_id):
    """Mark an insight as read"""
    try:
        insight = AIInsight.objects.get(id=insight_id, user=request.user)
        insight.is_read = True
        insight.save()
        
        return Response({'message': 'Insight marked as read'})
    
    except AIInsight.DoesNotExist:
        return Response({'error': 'Insight not found'}, 
                       status=status.HTTP_404_NOT_FOUND)

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def dismiss_insight(request, insight_id):
    """Dismiss an insight"""
    try:
        insight = AIInsight.objects.get(id=insight_id, user=request.user)
        insight.is_dismissed = True
        insight.save()
        
        # Log the dismissal
        AuditLog.objects.create(
            user=request.user,
            action='UPDATE',
            resource='ai_insight',
            resource_id=str(insight.id),
            details={'action': 'dismissed', 'title': insight.title}
        )
        
        return Response({'message': 'Insight dismissed'})
    
    except AIInsight.DoesNotExist:
        return Response({'error': 'Insight not found'}, 
                       status=status.HTTP_404_NOT_FOUND)

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def ai_analytics(request):
    """Get AI analytics and insights summary"""
    user_insights = AIInsight.objects.filter(user=request.user)
    
    analytics = {
        'total_insights': user_insights.count(),
        'unread_insights': user_insights.filter(is_read=False).count(),
        'high_priority': user_insights.filter(priority='high').count(),
        'action_required': user_insights.filter(action_required=True).count(),
        'by_type': {},
        'recent_insights': AIInsightSerializer(
            user_insights.order_by('-created_at')[:5], many=True
        ).data
    }
    
    # Count by insight type
    for insight_type, _ in AIInsight.TYPE_CHOICES:
        count = user_insights.filter(insight_type=insight_type).count()
        if count > 0:
            analytics['by_type'][insight_type] = count
    
    return Response(analytics)

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def analyze_documents(request):
    """Analyze user's documents for insights"""
    document_ids = request.data.get('document_ids', [])
    
    if not document_ids:
        return Response({'error': 'No document IDs provided'}, 
                       status=status.HTTP_400_BAD_REQUEST)
    
    documents = Document.objects.filter(
        id__in=document_ids, 
        user=request.user,
        status='completed'
    )
    
    if not documents.exists():
        return Response({'error': 'No valid documents found'}, 
                       status=status.HTTP_404_NOT_FOUND)
    
    # Prepare document data for analysis
    analysis_prompt = "Analyze these business documents for tax optimization opportunities:\n\n"
    
    for doc in documents:
        analysis_prompt += f"Document: {doc.name} ({doc.category})\n"
        if doc.ai_summary:
            analysis_prompt += f"Summary: {doc.ai_summary}\n"
        if doc.extracted_data:
            analysis_prompt += f"Key data: {doc.extracted_data}\n"
        analysis_prompt += "\n"
    
    analysis_prompt += "Provide specific tax advice and compliance recommendations."
    
    try:
        ai_response = ai_advisor.get_tax_advice(analysis_prompt)
        
        return Response({
            'analysis': ai_response,
            'documents_analyzed': documents.count(),
            'document_names': [doc.name for doc in documents]
        })
    
    except Exception as e:
        return Response(
            {'error': 'Failed to analyze documents. Please try again.'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )