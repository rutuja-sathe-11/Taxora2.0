from rest_framework import serializers
from django.contrib.auth import authenticate
from django.db import models
from .models import User, AuditLog, ClientRelationship

class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True)
    
    class Meta:
        model = User
        fields = ['email', 'username', 'password', 'password_confirm', 'first_name', 
                 'last_name', 'role', 'business_name', 'gst_number', 'phone']
    
    def validate(self, data):
        if data['password'] != data['password_confirm']:
            raise serializers.ValidationError("Passwords don't match")
        return data
    
    def create(self, validated_data):
        validated_data.pop('password_confirm', None)
        password = validated_data.pop('password')
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user


class PasswordResetSerializer(serializers.Serializer):
    email = serializers.EmailField()


class PasswordResetConfirmSerializer(serializers.Serializer):
    uid = serializers.CharField()
    token = serializers.CharField()
    new_password = serializers.CharField(write_only=True, min_length=8)
    new_password_confirm = serializers.CharField(write_only=True)

    def validate(self, data):
        if data['new_password'] != data['new_password_confirm']:
            raise serializers.ValidationError("Passwords don't match")
        return data
    
    def create(self, validated_data):
        validated_data.pop('password_confirm')
        user = User.objects.create_user(**validated_data)
        return user

class UserLoginSerializer(serializers.Serializer):
    username = serializers.CharField(required=False, allow_blank=True)
    email = serializers.EmailField(required=False, allow_blank=True)
    password = serializers.CharField(write_only=True)
    
    def validate(self, data):
        username = data.get('username')
        email = data.get('email')
        password = data.get('password')
        
        if not password:
            raise serializers.ValidationError('Password is required')
        
        user = None
        if email:
            try:
                user = User.objects.get(email=email)
            except User.DoesNotExist:
                pass
        elif username:
            user = authenticate(username=username, password=password)
        
        if not user:
            raise serializers.ValidationError('Invalid credentials')
        
        if not user.is_active:
            raise serializers.ValidationError('User account is disabled')
        
        # Verify password if we got user by email
        if email and not user.check_password(password):
            raise serializers.ValidationError('Invalid credentials')
        
        data['user'] = user
        return data

class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'role',
                 'business_name', 'gst_number', 'phone', 'address', 'profile_picture',
                 'is_verified', 'created_at']
        read_only_fields = ['id', 'username', 'created_at']

class AuditLogSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    
    class Meta:
        model = AuditLog
        fields = ['id', 'user_name', 'action', 'resource', 'resource_id', 
                 'details', 'timestamp']

class ClientRelationshipSerializer(serializers.ModelSerializer):
    ca_name = serializers.CharField(source='ca.get_full_name', read_only=True)
    ca_id = serializers.UUIDField(source='ca.id', read_only=True)
    ca_email = serializers.EmailField(source='ca.email', read_only=True)
    sme_name = serializers.CharField(source='sme.get_full_name', read_only=True)
    sme_id = serializers.UUIDField(source='sme.id', read_only=True)
    sme_email = serializers.EmailField(source='sme.email', read_only=True)
    sme_business = serializers.CharField(source='sme.business_name', read_only=True)
    sme_gst_number = serializers.CharField(source='sme.gst_number', read_only=True)
    sme_phone = serializers.CharField(source='sme.phone', read_only=True)
    sme_address = serializers.CharField(source='sme.address', read_only=True)
    sme_profile_metadata = serializers.JSONField(source='sme.profile_metadata', read_only=True)
    
    # Client statistics
    total_transactions = serializers.SerializerMethodField()
    pending_reviews = serializers.SerializerMethodField()
    monthly_revenue = serializers.SerializerMethodField()
    last_activity = serializers.SerializerMethodField()
    
    class Meta:
        model = ClientRelationship
        fields = ['id', 'ca_id', 'ca_name', 'ca_email', 'sme_id', 'sme_name', 
                 'sme_email', 'sme_business', 'sme_gst_number', 'sme_phone', 'sme_address',
                 'sme_profile_metadata', 'is_active', 'access_level', 'created_at',
                 'total_transactions', 'pending_reviews', 'monthly_revenue', 'last_activity']
    
    def get_total_transactions(self, obj):
        from apps.transactions.models import Transaction
        return Transaction.objects.filter(user=obj.sme).count()
    
    def get_pending_reviews(self, obj):
        from apps.transactions.models import Transaction
        return Transaction.objects.filter(
            user=obj.sme, 
            status__in=['pending', 'flagged']
        ).count()
    
    def get_monthly_revenue(self, obj):
        from apps.transactions.models import Transaction
        from django.utils import timezone
        from datetime import timedelta
        
        month_start = timezone.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        income = Transaction.objects.filter(
            user=obj.sme,
            type='income',
            status='approved',
            date__gte=month_start
        ).aggregate(total=models.Sum('amount'))['total'] or 0
        
        return float(income)
    
    def get_last_activity(self, obj):
        from apps.transactions.models import Transaction
        last_transaction = Transaction.objects.filter(user=obj.sme).order_by('-created_at').first()
        if last_transaction:
            return last_transaction.created_at.strftime('%Y-%m-%d')
        return obj.created_at.strftime('%Y-%m-%d')