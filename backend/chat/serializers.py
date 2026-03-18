from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Conversation, Message

User = get_user_model()


class UserMinimalSerializer(serializers.ModelSerializer):
    """Minimal user info for chat displays"""
    full_name = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'full_name', 'role', 'business_name', 'profile_picture']
        read_only_fields = ['id', 'username', 'email', 'full_name', 'role', 'business_name', 'profile_picture']
    
    def get_full_name(self, obj):
        return obj.get_full_name() or obj.username


class MessageSerializer(serializers.ModelSerializer):
    """Serializer for individual messages"""
    sender_detail = UserMinimalSerializer(source='sender', read_only=True)
    sender_id = serializers.SerializerMethodField()
    
    class Meta:
        model = Message
        fields = [
            'id', 'conversation', 'sender', 'sender_id', 'sender_detail', 'content',
            'is_read', 'read_at', 'created_at', 'updated_at',
            'attachment', 'attachment_type'
        ]
        read_only_fields = ['id', 'sender', 'sender_detail', 'is_read', 'read_at', 'created_at', 'updated_at']
    
    def get_sender_id(self, obj):
        return str(obj.sender.id)


class ConversationListSerializer(serializers.ModelSerializer):
    """Serializer for conversation list view"""
    ca_detail = UserMinimalSerializer(source='ca', read_only=True)
    sme_detail = UserMinimalSerializer(source='sme', read_only=True)
    last_message = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()
    other_participant = serializers.SerializerMethodField()
    
    class Meta:
        model = Conversation
        fields = [
            'id', 'ca', 'ca_detail', 'sme', 'sme_detail', 'status',
            'created_at', 'updated_at', 'last_message_at',
            'last_message', 'unread_count', 'other_participant'
        ]
        read_only_fields = [
            'id', 'ca', 'ca_detail', 'sme', 'sme_detail',
            'created_at', 'updated_at', 'last_message_at'
        ]
    
    def get_last_message(self, obj):
        """Get the last message in the conversation"""
        last_msg = obj.messages.order_by('-created_at').first()
        if last_msg:
            return {
                'id': str(last_msg.id),
                'content': last_msg.content[:100],  # First 100 chars
                'created_at': last_msg.created_at,
                'sender_id': str(last_msg.sender.id),
            }
        return None
    
    def get_unread_count(self, obj):
        """Get unread message count for current user"""
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            if request.user == obj.ca:
                return obj.unread_by_ca
            elif request.user == obj.sme:
                return obj.unread_by_sme
        return 0
    
    def get_other_participant(self, obj):
        """Get the other participant's info"""
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            if request.user == obj.ca:
                return UserMinimalSerializer(obj.sme).data
            elif request.user == obj.sme:
                return UserMinimalSerializer(obj.ca).data
        return None


class ConversationDetailSerializer(serializers.ModelSerializer):
    """Serializer for detailed conversation view with messages"""
    ca_detail = UserMinimalSerializer(source='ca', read_only=True)
    sme_detail = UserMinimalSerializer(source='sme', read_only=True)
    messages = MessageSerializer(many=True, read_only=True)
    
    class Meta:
        model = Conversation
        fields = [
            'id', 'ca', 'ca_detail', 'sme', 'sme_detail', 'status',
            'created_at', 'updated_at', 'last_message_at',
            'messages'
        ]
        read_only_fields = [
            'id', 'ca', 'ca_detail', 'sme', 'sme_detail',
            'created_at', 'updated_at', 'last_message_at', 'messages'
        ]


class ConversationStatusUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating conversation status"""
    
    class Meta:
        model = Conversation
        fields = ['status']
    
    def validate_status(self, value):
        """Validate status transitions"""
        if self.instance:
            current_status = self.instance.status
            # Only CA can accept/reject pending requests
            if current_status == 'pending' and value not in ['accepted', 'rejected']:
                raise serializers.ValidationError(
                    f"Cannot transition from '{current_status}' to '{value}'"
                )
        return value


class MessageCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating new messages"""
    
    class Meta:
        model = Message
        fields = ['content', 'attachment', 'attachment_type']
    
    def create(self, validated_data):
        """Override create to set sender and conversation from context"""
        request = self.context.get('request')
        conversation = self.context.get('conversation')
        
        message = Message.objects.create(
            sender=request.user,
            conversation=conversation,
            **validated_data
        )
        
        # Update conversation's last_message_at
        conversation.last_message_at = message.created_at
        conversation.save(update_fields=['last_message_at', 'updated_at'])
        
        # Update unread count for other participant
        if conversation.ca == request.user:
            conversation.unread_by_sme += 1
        else:
            conversation.unread_by_ca += 1
        conversation.save(update_fields=['unread_by_ca', 'unread_by_sme'])
        
        return message


class ConversationCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating a new conversation (connection request)"""
    
    class Meta:
        model = Conversation
        fields = ['ca', 'sme']
    
    def validate(self, data):
        """Validate that roles are correct and no duplicate exists"""
        ca = data.get('ca')
        sme = data.get('sme')
        
        if ca.role != 'CA':
            raise serializers.ValidationError("CA must have role 'CA'")
        if sme.role != 'SME':
            raise serializers.ValidationError("SME must have role 'SME'")
        
        # Check if conversation already exists
        existing = Conversation.objects.filter(ca=ca, sme=sme).exists()
        if existing:
            raise serializers.ValidationError("Conversation already exists between these users")
        
        return data
