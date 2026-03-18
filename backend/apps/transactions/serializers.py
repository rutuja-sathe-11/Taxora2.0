from rest_framework import serializers
from .models import Transaction, TransactionCategory, RecurringTransaction, BankAccount
from apps.documents.serializers import DocumentSerializer

class TransactionCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = TransactionCategory
        fields = '__all__'

class TransactionSerializer(serializers.ModelSerializer):
    documents = DocumentSerializer(many=True, read_only=True)
    category_name = serializers.CharField(source='category', read_only=True)
    reviewed_by_name = serializers.CharField(source='reviewed_by.get_full_name', read_only=True)
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    user_business = serializers.CharField(source='user.business_name', read_only=True)
    total_tax_amount = serializers.ReadOnlyField()
    net_amount = serializers.ReadOnlyField()
    
    class Meta:
        model = Transaction
        fields = ['id', 'date', 'description', 'amount', 'type', 'category', 
                 'category_name', 'status', 'invoice_number', 'vendor_name', 
                 'gst_number', 'cgst_amount', 'sgst_amount', 'igst_amount', 
                 'tds_amount', 'total_tax_amount', 'net_amount', 'ai_analysis', 
                 'confidence_score', 'anomaly_flags', 'documents', 'reviewed_by_name', 
                 'reviewed_at', 'review_notes', 'created_at', 'updated_at',
                 'user_name', 'user_business']
        read_only_fields = ['id', 'ai_analysis', 'confidence_score', 'anomaly_flags', 
                           'reviewed_by_name', 'reviewed_at', 'created_at', 'updated_at',
                           'user_name', 'user_business']

class TransactionCreateSerializer(serializers.ModelSerializer):
    document_ids = serializers.ListField(child=serializers.UUIDField(), required=False)
    
    class Meta:
        model = Transaction
        fields = ['date', 'description', 'amount', 'type', 'category', 
                 'invoice_number', 'vendor_name', 'gst_number', 
                 'cgst_amount', 'sgst_amount', 'igst_amount', 'tds_amount',
                 'document_ids']
    
    def create(self, validated_data):
        document_ids = validated_data.pop('document_ids', [])
        validated_data['user'] = self.context['request'].user
        transaction = super().create(validated_data)
        
        if document_ids:
            from apps.documents.models import Document
            documents = Document.objects.filter(
                id__in=document_ids,
                user=self.context['request'].user
            )
            transaction.documents.set(documents)
        
        return transaction

class RecurringTransactionSerializer(serializers.ModelSerializer):
    template_transaction = TransactionSerializer(read_only=True)
    
    class Meta:
        model = RecurringTransaction
        fields = '__all__'
        read_only_fields = ['id', 'created_at']

class BankAccountSerializer(serializers.ModelSerializer):
    class Meta:
        model = BankAccount
        fields = '__all__'
        read_only_fields = ['id', 'created_at']
    
    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)

class TransactionSummarySerializer(serializers.Serializer):
    total_income = serializers.DecimalField(max_digits=15, decimal_places=2)
    total_expenses = serializers.DecimalField(max_digits=15, decimal_places=2)
    net_profit = serializers.DecimalField(max_digits=15, decimal_places=2)
    monthly_revenue = serializers.DecimalField(max_digits=15, decimal_places=2)
    total_gst_collected = serializers.DecimalField(max_digits=15, decimal_places=2)
    total_gst_paid = serializers.DecimalField(max_digits=15, decimal_places=2)
    total_tds = serializers.DecimalField(max_digits=15, decimal_places=2)
    transaction_count = serializers.IntegerField()
    pending_reviews = serializers.IntegerField()