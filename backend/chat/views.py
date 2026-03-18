from rest_framework import status, permissions, viewsets, generics
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from django.shortcuts import get_object_or_404
from django.db.models import Q
from django.utils import timezone
from .models import Conversation, Message
from .serializers import (
    ConversationListSerializer, ConversationDetailSerializer,
    ConversationStatusUpdateSerializer, MessageCreateSerializer,
    MessageSerializer, ConversationCreateSerializer
)


class StandardResultsSetPagination(PageNumberPagination):
    page_size = 50
    page_size_query_param = 'page_size'
    max_page_size = 100


class ConversationViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing conversations between CA and SME users.
    
    Endpoints:
    - GET /conversations/ - List all conversations for current user
    - GET /conversations/{id}/ - Get conversation details with all messages
    - POST /conversations/ - Create a new conversation (SME sends request to CA)
    - PATCH /conversations/{id}/accept/ - CA accepts pending conversation
    - PATCH /conversations/{id}/reject/ - CA rejects pending conversation
    - PATCH /conversations/{id}/mark_as_read/ - Mark all messages as read
    """
    
    serializer_class = ConversationListSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = StandardResultsSetPagination
    
    def get_queryset(self):
        """
        Get conversations for the current user.
        SME users see conversations where they are the SME.
        CA users see conversations where they are the CA.
        """
        user = self.request.user
        
        if user.role == 'SME':
            return Conversation.objects.filter(sme=user).select_related('ca', 'sme')
        elif user.role == 'CA':
            return Conversation.objects.filter(ca=user).select_related('ca', 'sme')
        
        return Conversation.objects.none()
    
    def get_serializer_class(self):
        """Use different serializers for different actions"""
        if self.action == 'retrieve':
            return ConversationDetailSerializer
        elif self.action == 'create':
            return ConversationCreateSerializer
        elif self.action in ['accept', 'reject']:
            return ConversationStatusUpdateSerializer
        return ConversationListSerializer
    
    def create(self, request, *args, **kwargs):
        """
        SME user creates a connection request to a CA.
        Sets the conversation status to 'pending' awaiting CA acceptance.
        """
        if request.user.role != 'SME':
            return Response(
                {'error': 'Only SME users can create connection requests'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        ca_id = request.data.get('ca')
        
        if not ca_id:
            return Response(
                {'error': 'CA ID is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Verify CA exists and has CA role
        ca = get_object_or_404(Conversation.objects.none().model._meta.get_field('ca').remote_field.model, id=ca_id, role='CA')
        
        # Check if conversation already exists
        existing = Conversation.objects.filter(ca=ca, sme=request.user).first()
        if existing:
            return Response(
                {'detail': 'Connection request already exists',
                 'conversation': ConversationListSerializer(existing, context={'request': request}).data},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create new conversation with pending status
        conversation = Conversation.objects.create(
            ca=ca,
            sme=request.user,
            status='pending'
        )
        
        return Response(
            ConversationListSerializer(conversation, context={'request': request}).data,
            status=status.HTTP_201_CREATED
        )
    
    def retrieve(self, request, *args, **kwargs):
        """Get conversation details with all messages"""
        conversation = self.get_object()
        
        # Verify user is part of this conversation
        if request.user not in [conversation.ca, conversation.sme]:
            return Response(
                {'error': 'You do not have access to this conversation'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Mark all messages as read for current user
        unread_messages = conversation.messages.filter(is_read=False).exclude(sender=request.user)
        for message in unread_messages:
            message.mark_as_read()
        
        # Reset unread count for current user
        if request.user == conversation.ca:
            conversation.unread_by_ca = 0
        else:
            conversation.unread_by_sme = 0
        conversation.save()
        
        serializer = self.get_serializer(conversation)
        return Response(serializer.data)
    
    @action(detail=True, methods=['patch'], permission_classes=[permissions.IsAuthenticated])
    def accept(self, request, pk=None):
        """CA accepts a pending connection request"""
        conversation = self.get_object()
        
        if request.user != conversation.ca:
            return Response(
                {'error': 'Only the CA can accept this request'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        if conversation.status != 'pending':
            return Response(
                {'error': f'Cannot accept conversation with status "{conversation.status}"'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        conversation.status = 'active'
        conversation.save()
        
        return Response(
            ConversationListSerializer(conversation, context={'request': request}).data,
            status=status.HTTP_200_OK
        )
    
    @action(detail=True, methods=['patch'], permission_classes=[permissions.IsAuthenticated])
    def reject(self, request, pk=None):
        """CA rejects a pending connection request"""
        conversation = self.get_object()
        
        if request.user != conversation.ca:
            return Response(
                {'error': 'Only the CA can reject this request'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        if conversation.status != 'pending':
            return Response(
                {'error': f'Cannot reject conversation with status "{conversation.status}"'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        conversation.status = 'rejected'
        conversation.save()
        
        return Response(
            ConversationListSerializer(conversation, context={'request': request}).data,
            status=status.HTTP_200_OK
        )
    
    @action(detail=True, methods=['patch'], permission_classes=[permissions.IsAuthenticated])
    def mark_as_read(self, request, pk=None):
        """Mark all unread messages as read for current user"""
        conversation = self.get_object()
        
        if request.user not in [conversation.ca, conversation.sme]:
            return Response(
                {'error': 'You do not have access to this conversation'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Mark all unread messages sent by the other user as read
        unread_messages = conversation.messages.filter(is_read=False).exclude(sender=request.user)
        for message in unread_messages:
            message.mark_as_read()
        
        # Reset unread count
        if request.user == conversation.ca:
            conversation.unread_by_ca = 0
        else:
            conversation.unread_by_sme = 0
        conversation.save()
        
        return Response(
            {'status': 'All messages marked as read'},
            status=status.HTTP_200_OK
        )


class MessageViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing messages within conversations.
    
    Endpoints:
    - GET /conversations/{conversation_id}/messages/ - List messages in conversation
    - POST /conversations/{conversation_id}/messages/ - Send a new message
    - PATCH /messages/{id}/ - Mark message as read (read_at timestamp)
    """
    
    serializer_class = MessageSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = StandardResultsSetPagination
    
    def get_queryset(self):
        """Get messages for a specific conversation"""
        conversation_pk = self.kwargs.get('conversation_pk')
        return Message.objects.filter(
            conversation_id=conversation_pk
        ).select_related('sender', 'conversation')
    
    def get_serializer_class(self):
        """Use different serializer for create"""
        if self.action == 'create':
            return MessageCreateSerializer
        return MessageSerializer
    
    def create(self, request, *args, **kwargs):
        """Send a new message in the conversation"""
        conversation_pk = self.kwargs.get('conversation_pk')
        conversation = get_object_or_404(Conversation, id=conversation_pk)
        
        # Verify user is part of this conversation
        if request.user not in [conversation.ca, conversation.sme]:
            return Response(
                {'error': 'You do not have access to this conversation'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Can't send messages to pending conversations
        if conversation.status == 'pending':
            return Response(
                {'error': 'Cannot send messages in pending conversations'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create message
        serializer = self.get_serializer(data=request.data, context={
            'request': request,
            'conversation': conversation
        })
        
        if serializer.is_valid():
            message = serializer.save()
            return Response(
                MessageSerializer(message, context={'request': request}).data,
                status=status.HTTP_201_CREATED
            )
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def list(self, request, *args, **kwargs):
        """List all messages in a conversation"""
        conversation_pk = self.kwargs.get('conversation_pk')
        conversation = get_object_or_404(Conversation, id=conversation_pk)
        
        # Verify user is part of this conversation
        if request.user not in [conversation.ca, conversation.sme]:
            return Response(
                {'error': 'You do not have access to this conversation'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        return super().list(request, *args, **kwargs)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def conversation_list(request):
    """
    List all conversations for current user.
    Includes unread counts and last message preview.
    """
    user = request.user
    
    if user.role == 'SME':
        conversations = Conversation.objects.filter(sme=user).select_related('ca', 'sme')
    elif user.role == 'CA':
        conversations = Conversation.objects.filter(ca=user).select_related('ca', 'sme')
    else:
        conversations = Conversation.objects.none()
    
    # Paginate
    paginator = StandardResultsSetPagination()
    paginated_conversations = paginator.paginate_queryset(conversations, request)
    
    serializer = ConversationListSerializer(
        paginated_conversations,
        many=True,
        context={'request': request}
    )
    
    return paginator.get_paginated_response(serializer.data)


@api_view(['GET', 'POST'])
@permission_classes([permissions.IsAuthenticated])
def send_connection_request(request, ca_id):
    """
    SME sends a connection request to a CA.
    POST endpoint to create a new conversation.
    """
    if request.method == 'POST':
        if request.user.role != 'SME':
            return Response(
                {'error': 'Only SME users can send connection requests'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Get the CA user
        from django.contrib.auth import get_user_model
        User = get_user_model()
        ca = get_object_or_404(User, id=ca_id, role='CA')
        
        # Check if conversation already exists
        existing = Conversation.objects.filter(ca=ca, sme=request.user).first()
        if existing:
            return Response(
                {'detail': 'Connection request already exists',
                 'conversation': ConversationListSerializer(existing, context={'request': request}).data},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create new conversation with pending status
        conversation = Conversation.objects.create(
            ca=ca,
            sme=request.user,
            status='pending'
        )
        
        return Response(
            ConversationListSerializer(conversation, context={'request': request}).data,
            status=status.HTTP_201_CREATED
        )
