from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import (
    ComplianceRule, ComplianceCalendar, TaxCalculator, 
    GSTReturn, ITRFiling, ComplianceScore, Client, Transaction, ITRRecord, TDSRecord, Message, Report, Notice
)
from apps.users.models import ClientRelationship

class ComplianceRuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = ComplianceRule
        fields = '__all__'

class ComplianceCalendarSerializer(serializers.ModelSerializer):
    rule_name = serializers.CharField(source='rule.name', read_only=True)
    rule_type = serializers.CharField(source='rule.rule_type', read_only=True)
    days_until_due = serializers.SerializerMethodField()
    
    class Meta:
        model = ComplianceCalendar
        fields = ['id', 'rule', 'rule_name', 'rule_type', 'due_date', 'title', 
                 'description', 'is_completed', 'completed_at', 'days_until_due', 
                 'created_at']
        read_only_fields = ['id', 'created_at']
    
    def get_days_until_due(self, obj):
        from datetime import date
        if obj.due_date:
            delta = obj.due_date - date.today()
            return delta.days
        return None

class TaxCalculatorSerializer(serializers.ModelSerializer):
    class Meta:
        model = TaxCalculator
        fields = '__all__'

class GSTReturnSerializer(serializers.ModelSerializer):
    is_overdue = serializers.SerializerMethodField()
    
    class Meta:
        model = GSTReturn
        fields = ['id', 'return_type', 'period', 'due_date', 'filing_date', 'status',
                 'total_taxable_value', 'total_tax_payable', 'total_input_credit',
                 'net_tax_payable', 'acknowledgment_number', 'is_overdue',
                 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_is_overdue(self, obj):
        from datetime import date
        return obj.due_date < date.today() and obj.status in ['draft', 'not_filed']

class ITRFilingSerializer(serializers.ModelSerializer):
    is_overdue = serializers.SerializerMethodField()
    
    class Meta:
        model = ITRFiling
        fields = ['id', 'assessment_year', 'itr_form', 'filing_date', 'due_date', 'status',
                 'gross_total_income', 'total_deductions', 'taxable_income', 
                 'tax_computed', 'tax_paid', 'refund_amount', 'acknowledgment_number',
                 'is_overdue', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_is_overdue(self, obj):
        from datetime import date
        return obj.due_date < date.today() and obj.status == 'draft'

class ComplianceScoreSerializer(serializers.ModelSerializer):
    score_level = serializers.SerializerMethodField()
    
    class Meta:
        model = ComplianceScore
        fields = ['overall_score', 'gst_score', 'itr_score', 'tds_score', 
                 'documentation_score', 'late_filings', 'missing_documents', 
                 'compliance_issues', 'score_level', 'last_calculated']
        read_only_fields = ['last_calculated']
    
    def get_score_level(self, obj):
        if obj.overall_score >= 90:
            return 'Excellent'
        elif obj.overall_score >= 75:
            return 'Good'
        elif obj.overall_score >= 60:
            return 'Average'
        else:
            return 'Needs Improvement'

class TaxCalculationSerializer(serializers.Serializer):
    """For tax calculation requests"""
    income_amount = serializers.DecimalField(max_digits=15, decimal_places=2)
    calculation_type = serializers.CharField(max_length=30)
    assessment_year = serializers.CharField(max_length=10, required=False)
    deductions_80c = serializers.DecimalField(max_digits=10, decimal_places=2, default=0)
    deductions_80d = serializers.DecimalField(max_digits=10, decimal_places=2, default=0)
    other_deductions = serializers.DecimalField(max_digits=10, decimal_places=2, default=0)
    
class GSTCalculationSerializer(serializers.Serializer):
    """For GST calculation requests"""
    taxable_amount = serializers.DecimalField(max_digits=15, decimal_places=2)
    gst_rate = serializers.DecimalField(max_digits=5, decimal_places=2)
    state_code = serializers.CharField(max_length=2, required=False)
    transaction_type = serializers.ChoiceField(choices=['intrastate', 'interstate'])


class GSTTransactionSerializer(serializers.ModelSerializer):
    client_name = serializers.CharField(source='client.name', read_only=True)

    class Meta:
        model = Transaction
        fields = [
            'id', 'client', 'client_name', 'type', 'amount', 'gst_rate',
            'description', 'date', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'client_name']


class GSTTransactionCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Transaction
        fields = ['client', 'type', 'amount', 'gst_rate', 'description', 'date']

    def validate_client(self, value):
        request = self.context.get('request')
        if not request or value.user_id != request.user.id:
            raise serializers.ValidationError('Invalid client or access denied')
        return value


class GSTCalculationResponseSerializer(serializers.Serializer):
    client_id = serializers.IntegerField()
    output_tax = serializers.DecimalField(max_digits=15, decimal_places=2)
    input_tax = serializers.DecimalField(max_digits=15, decimal_places=2)
    net_tax = serializers.DecimalField(max_digits=15, decimal_places=2)


class GSTR3BResponseSerializer(serializers.Serializer):
    client_id = serializers.IntegerField()
    period = serializers.CharField()
    outward_supplies = serializers.DictField()
    inward_supplies = serializers.DictField()
    tax_liability = serializers.DictField()
    transaction_count = serializers.IntegerField()


class ITRCalculationInputSerializer(serializers.Serializer):
    client_id = serializers.CharField()
    assessment_year = serializers.CharField(max_length=9)
    salary_income = serializers.DecimalField(max_digits=15, decimal_places=2, default=0)
    business_income = serializers.DecimalField(max_digits=15, decimal_places=2, default=0)
    other_income = serializers.DecimalField(max_digits=15, decimal_places=2, default=0)
    deductions_80c = serializers.DecimalField(max_digits=15, decimal_places=2, default=0)
    deductions_80d = serializers.DecimalField(max_digits=15, decimal_places=2, default=0)
    deductions_other = serializers.DecimalField(max_digits=15, decimal_places=2, default=0)
    tds_paid = serializers.DecimalField(max_digits=15, decimal_places=2, default=0)


class ITRCalculationResultSerializer(serializers.Serializer):
    client_id = serializers.IntegerField()
    assessment_year = serializers.CharField()
    pan = serializers.CharField()
    total_income = serializers.DecimalField(max_digits=15, decimal_places=2)
    deductions = serializers.DictField()
    taxable_income = serializers.DecimalField(max_digits=15, decimal_places=2)
    tax_payable = serializers.DecimalField(max_digits=15, decimal_places=2)
    tds_paid = serializers.DecimalField(max_digits=15, decimal_places=2)
    refund_or_payable = serializers.DictField()
    itr_json = serializers.DictField()
    record_id = serializers.IntegerField()


class ITRRecordSerializer(serializers.ModelSerializer):
    client_name = serializers.CharField(source='client.name', read_only=True)

    class Meta:
        model = ITRRecord
        fields = [
            'id', 'client', 'client_name', 'assessment_year', 'salary_income',
            'business_income', 'other_income', 'deductions', 'taxable_income',
            'tax_payable', 'tds_paid', 'status', 'created_at', 'updated_at'
        ]


class ITRClientSummarySerializer(serializers.Serializer):
    client_name = serializers.CharField()
    pan = serializers.CharField()
    assessment_year = serializers.CharField()
    income_breakdown = serializers.DictField()
    deductions = serializers.DictField()
    taxable_income = serializers.DecimalField(max_digits=15, decimal_places=2)
    tax_payable = serializers.DecimalField(max_digits=15, decimal_places=2)
    tds_paid = serializers.DecimalField(max_digits=15, decimal_places=2)
    refund_or_payable = serializers.DictField()
    plain_language_summary = serializers.CharField()


class TDSCalculationInputSerializer(serializers.Serializer):
    client_id = serializers.CharField()
    payment_type = serializers.ChoiceField(choices=[
        '194J', '194C', '194H', '194I', '194A'
    ])
    amount = serializers.DecimalField(max_digits=15, decimal_places=2)
    pan_available = serializers.BooleanField()
    date = serializers.DateField(required=False)


class TDSRecordSerializer(serializers.ModelSerializer):
    client_name = serializers.CharField(source='client.name', read_only=True)

    class Meta:
        model = TDSRecord
        fields = [
            'id', 'client', 'client_name', 'payment_type', 'section', 'pan_available',
            'tds_rate', 'amount', 'tds_deducted', 'date', 'created_at', 'updated_at'
        ]


class TDSCalculationResponseSerializer(serializers.Serializer):
    client_id = serializers.IntegerField()
    payment_type = serializers.CharField()
    section = serializers.CharField()
    pan_available = serializers.BooleanField()
    amount = serializers.DecimalField(max_digits=15, decimal_places=2)
    tds_rate = serializers.DecimalField(max_digits=5, decimal_places=2)
    tds_deducted = serializers.DecimalField(max_digits=15, decimal_places=2)
    record_id = serializers.IntegerField()


class PnLReportResponseSerializer(serializers.Serializer):
    client_id = serializers.IntegerField()
    report_id = serializers.IntegerField()
    report_type = serializers.CharField()
    total_sales = serializers.DecimalField(max_digits=15, decimal_places=2)
    total_expenses = serializers.DecimalField(max_digits=15, decimal_places=2)
    net_profit = serializers.DecimalField(max_digits=15, decimal_places=2)
    generated_at = serializers.DateTimeField()
    file_url = serializers.CharField(allow_null=True)


class MessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.SerializerMethodField()
    sender_role = serializers.CharField(source='sender.role', read_only=True)
    file_url = serializers.SerializerMethodField()
    report_type = serializers.CharField(source='report.report_type', read_only=True)

    class Meta:
        model = Message
        fields = [
            'id', 'client', 'sender', 'sender_name', 'sender_role',
            'message_text', 'report', 'report_type', 'file_attachment', 'file_url',
            'timestamp'
        ]
        read_only_fields = ['id', 'sender', 'sender_name', 'sender_role', 'report_type', 'file_url', 'timestamp']

    def get_sender_name(self, obj):
        if not obj.sender:
            return 'System'
        return obj.sender.get_full_name() or obj.sender.username

    def get_file_url(self, obj):
        request = self.context.get('request')
        if obj.file_attachment and request:
            return request.build_absolute_uri(obj.file_attachment.url)
        return None


class MessageSendSerializer(serializers.Serializer):
    client_id = serializers.CharField()
    message_text = serializers.CharField(required=False, allow_blank=True)
    report_id = serializers.IntegerField(required=False)
    file_attachment = serializers.FileField(required=False)

    def validate(self, attrs):
        request = self.context.get('request')
        if not request:
            raise serializers.ValidationError('Invalid request context')

        client_id = attrs.get('client_id')
        client = None

        normalized = str(client_id).strip()
        if normalized.isdigit():
            client = Client.objects.filter(id=int(normalized)).first()

        if not client:
            User = get_user_model()
            try:
                related_user = User.objects.get(id=normalized)
            except (User.DoesNotExist, ValueError, TypeError):
                related_user = None

            if related_user and request.user.role == 'CA' and related_user.role == 'SME':
                relationship_exists = ClientRelationship.objects.filter(
                    ca=request.user,
                    sme=related_user,
                    is_active=True,
                ).exists()
                if relationship_exists:
                    client = Client.objects.filter(user=request.user, email__iexact=related_user.email).first()
                    if not client:
                        metadata = getattr(related_user, 'profile_metadata', {}) or {}
                        pan_value = (metadata.get('pan_number') or '').upper().strip()
                        if len(pan_value) != 10:
                            pan_value = 'AAAAA0000A'

                        gstin_value = (getattr(related_user, 'gst_number', '') or '').strip().upper()
                        if gstin_value and len(gstin_value) != 15:
                            gstin_value = ''

                        client = Client.objects.create(
                            user=request.user,
                            name=related_user.get_full_name() or related_user.business_name or related_user.email,
                            email=related_user.email,
                            phone=getattr(related_user, 'phone', '') or '',
                            pan=pan_value,
                            gstin=gstin_value,
                            address=getattr(related_user, 'address', '') or '',
                        )

            if not client and related_user and request.user.role == 'SME' and str(related_user.id) == str(request.user.id):
                client = Client.objects.filter(user=request.user, email__iexact=request.user.email).first()

        if not client:
            raise serializers.ValidationError({'client_id': 'Client not found'})

        if request.user != client.user and (
            request.user.role != 'SME' or request.user.email.lower() != client.email.lower()
        ):
            raise serializers.ValidationError('Access denied for this client')

        report = None
        report_id = attrs.get('report_id')
        if report_id:
            try:
                report = Report.objects.get(id=report_id, client=client)
            except Report.DoesNotExist:
                raise serializers.ValidationError({'report_id': 'Report not found for this client'})

        if not attrs.get('message_text') and not attrs.get('file_attachment') and not report:
            raise serializers.ValidationError('Provide message_text, file_attachment, or report_id')

        attrs['client'] = client
        attrs['report'] = report
        return attrs


class NoticeSerializer(serializers.ModelSerializer):
    client_name = serializers.CharField(source='client.name', read_only=True)
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = Notice
        fields = [
            'id', 'client', 'client_name', 'type', 'file', 'file_url', 'status', 'created_at'
        ]
        read_only_fields = ['id', 'created_at', 'client_name', 'file_url']

    def get_file_url(self, obj):
        request = self.context.get('request')
        if obj.file and request:
            return request.build_absolute_uri(obj.file.url)
        return None


class ReportSerializer(serializers.ModelSerializer):
    client_name = serializers.CharField(source='client.name', read_only=True)
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = Report
        fields = ['id', 'client', 'client_name', 'report_type', 'file', 'file_url', 'created_at']
        read_only_fields = ['id', 'client_name', 'file_url', 'created_at']

    def get_file_url(self, obj):
        request = self.context.get('request')
        if obj.file and request:
            return request.build_absolute_uri(obj.file.url)
        return None