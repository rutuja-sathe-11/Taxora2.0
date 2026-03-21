from rest_framework import generics, status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError
from django.utils import timezone
from django.db.models import Sum
from django.core.files.base import ContentFile
from django.contrib.auth import get_user_model
from datetime import datetime, timedelta, date
from decimal import Decimal
import io
import csv
from .models import (
    ComplianceRule, ComplianceCalendar, TaxCalculator,
    GSTReturn, ITRFiling, ComplianceScore, Client, Transaction as GSTTransaction, ITRRecord, TDSRecord, Report, Message, Notice
)
from .serializers import (
    ComplianceRuleSerializer, ComplianceCalendarSerializer,
    TaxCalculatorSerializer, GSTReturnSerializer, ITRFilingSerializer,
    ComplianceScoreSerializer, TaxCalculationSerializer, GSTCalculationSerializer,
    GSTTransactionSerializer, GSTTransactionCreateSerializer,
    GSTCalculationResponseSerializer, GSTR3BResponseSerializer,
    ITRCalculationInputSerializer, ITRCalculationResultSerializer, ITRRecordSerializer,
    ITRClientSummarySerializer, TDSCalculationInputSerializer,
    TDSRecordSerializer, TDSCalculationResponseSerializer, PnLReportResponseSerializer,
    MessageSerializer, MessageSendSerializer, NoticeSerializer, ReportSerializer
)
from apps.users.models import AuditLog, ClientRelationship


def _build_client_defaults_from_user(user):
    metadata = getattr(user, 'profile_metadata', {}) or {}
    pan_value = (metadata.get('pan_number') or '').upper().strip()
    if len(pan_value) != 10:
        pan_value = 'AAAAA0000A'

    gstin_value = (getattr(user, 'gst_number', '') or '').strip().upper()
    if gstin_value and len(gstin_value) != 15:
        gstin_value = ''

    return {
        'name': user.get_full_name() or getattr(user, 'business_name', '') or user.email,
        'email': user.email,
        'phone': getattr(user, 'phone', '') or '',
        'pan': pan_value,
        'gstin': gstin_value,
        'address': getattr(user, 'address', '') or '',
    }


def _get_or_create_managed_client(owner_user, source_user):
    existing = Client.objects.filter(user=owner_user, email__iexact=source_user.email).first()
    if existing:
        return existing
    defaults = _build_client_defaults_from_user(source_user)
    return Client.objects.create(user=owner_user, **defaults)


def _resolve_client_for_user(user, client_identifier, create_if_missing=False):
    if client_identifier is None or str(client_identifier).strip() == '':
        return None

    normalized = str(client_identifier).strip()

    if normalized.isdigit():
        client = Client.objects.filter(id=int(normalized)).first()
        if client and _can_access_client(user, client):
            return client

        if user.role == 'CA':
            relationship = ClientRelationship.objects.filter(
                id=int(normalized),
                ca=user,
                is_active=True,
            ).select_related('sme').first()
            if relationship:
                if create_if_missing:
                    return _get_or_create_managed_client(user, relationship.sme)
                return Client.objects.filter(user=user, email__iexact=relationship.sme.email).first()

    User = get_user_model()
    try:
        related_user = User.objects.get(id=normalized)
    except (User.DoesNotExist, ValueError, TypeError):
        return None

    if user.role == 'CA':
        if related_user.role != 'SME':
            return None
        if not ClientRelationship.objects.filter(ca=user, sme=related_user, is_active=True).exists():
            return None
        if create_if_missing:
            return _get_or_create_managed_client(user, related_user)
        return Client.objects.filter(user=user, email__iexact=related_user.email).first()

    if user.role == 'SME' and str(related_user.id) == str(user.id):
        if create_if_missing:
            return _get_or_create_managed_client(user, user)
        return Client.objects.filter(user=user, email__iexact=user.email).first()

    return None


def _get_client_for_user(user, client_id):
    return _resolve_client_for_user(user, client_id, create_if_missing=True)


def _can_access_client(user, client):
    if user == client.user:
        return True
    if user.role == 'SME':
        if user.email and user.email.lower() == client.email.lower():
            return True
        return ClientRelationship.objects.filter(ca=client.user, sme=user, is_active=True).exists()
    return False


def _parse_period(period):
    try:
        return datetime.strptime(period, '%Y-%m')
    except (TypeError, ValueError):
        return None


def _compute_gst_data(transactions):
    output_tax = Decimal('0.00')
    input_tax = Decimal('0.00')
    outward_taxable = Decimal('0.00')
    inward_taxable = Decimal('0.00')

    for txn in transactions:
        gst_amount = (txn.amount * txn.gst_rate) / Decimal('100')
        if txn.type == 'sale':
            output_tax += gst_amount
            outward_taxable += txn.amount
        else:
            input_tax += gst_amount
            inward_taxable += txn.amount

    return {
        'output_tax': output_tax,
        'input_tax': input_tax,
        'net_tax': output_tax - input_tax,
        'outward_taxable': outward_taxable,
        'inward_taxable': inward_taxable,
    }


def _compute_itr_tax(taxable_income):
    remaining = Decimal(taxable_income)
    tax = Decimal('0.00')

    slabs = [
        (Decimal('300000.00'), Decimal('0.00')),
        (Decimal('300000.00'), Decimal('0.05')),
        (Decimal('300000.00'), Decimal('0.10')),
        (Decimal('300000.00'), Decimal('0.15')),
        (Decimal('300000.00'), Decimal('0.20')),
        (Decimal('999999999.00'), Decimal('0.30')),
    ]

    for slab_limit, rate in slabs:
        if remaining <= 0:
            break
        taxable_in_slab = min(remaining, slab_limit)
        tax += taxable_in_slab * rate
        remaining -= taxable_in_slab

    cess = tax * Decimal('0.04')
    total_tax = tax + cess
    return total_tax.quantize(Decimal('0.01'))


def _get_tds_rate(payment_type, pan_available):
    section_rates_with_pan = {
        '194J': Decimal('10.00'),
        '194C': Decimal('1.00'),
        '194H': Decimal('5.00'),
        '194I': Decimal('10.00'),
        '194A': Decimal('10.00'),
    }
    if not pan_available:
        return Decimal('20.00')
    return section_rates_with_pan.get(payment_type, Decimal('10.00'))


def _build_pnl_file(client, total_sales, total_expenses, net_profit):
    """Create a shareable report file (xlsx preferred, csv fallback)."""
    now_label = timezone.now().strftime('%Y%m%d_%H%M%S')

    try:
        from openpyxl import Workbook

        workbook = Workbook()
        sheet = workbook.active
        sheet.title = 'P&L Report'
        sheet.append(['Taxora - Profit & Loss Report'])
        sheet.append([])
        sheet.append(['Client', client.name])
        sheet.append(['PAN', client.pan])
        sheet.append(['Generated At', timezone.now().strftime('%Y-%m-%d %H:%M:%S')])
        sheet.append([])
        sheet.append(['Metric', 'Amount'])
        sheet.append(['Total Sales', float(total_sales)])
        sheet.append(['Total Expenses', float(total_expenses)])
        sheet.append(['Net Profit', float(net_profit)])

        binary = io.BytesIO()
        workbook.save(binary)
        binary.seek(0)
        filename = f'pnl_{client.id}_{now_label}.xlsx'
        return filename, binary.getvalue()
    except Exception:
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(['Taxora - Profit & Loss Report'])
        writer.writerow([])
        writer.writerow(['Client', client.name])
        writer.writerow(['PAN', client.pan])
        writer.writerow(['Generated At', timezone.now().strftime('%Y-%m-%d %H:%M:%S')])
        writer.writerow([])
        writer.writerow(['Metric', 'Amount'])
        writer.writerow(['Total Sales', float(total_sales)])
        writer.writerow(['Total Expenses', float(total_expenses)])
        writer.writerow(['Net Profit', float(net_profit)])
        filename = f'pnl_{client.id}_{now_label}.csv'
        return filename, output.getvalue().encode('utf-8')


class GSTTransactionListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return GSTTransactionCreateSerializer
        return GSTTransactionSerializer

    def get_queryset(self):
        queryset = GSTTransaction.objects.filter(client__user=self.request.user).select_related('client')
        client_id = self.request.query_params.get('client_id')
        if client_id:
            queryset = queryset.filter(client_id=client_id)
        return queryset.order_by('-date', '-created_at')

    def perform_create(self, serializer):
        transaction = serializer.save()
        AuditLog.objects.create(
            user=self.request.user,
            action='CREATE',
            resource='gst_transaction',
            resource_id=str(transaction.id),
            details={
                'client_id': transaction.client_id,
                'type': transaction.type,
                'amount': float(transaction.amount),
                'gst_rate': float(transaction.gst_rate),
            }
        )


class ClientTransactionListView(generics.ListAPIView):
    serializer_class = GSTTransactionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        client_id = self.kwargs.get('client_id')
        client = _resolve_client_for_user(self.request.user, client_id)
        if not client:
            return GSTTransaction.objects.none()
        return GSTTransaction.objects.filter(client=client).select_related('client').order_by('-date', '-created_at')


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def calculate_client_gst(request, client_id):
    client = _get_client_for_user(request.user, client_id)
    if not client:
        return Response({'error': 'Client not found or access denied'}, status=status.HTTP_404_NOT_FOUND)

    transactions = GSTTransaction.objects.filter(client=client)
    gst_data = _compute_gst_data(transactions)

    payload = {
        'client_id': client.id,
        'output_tax': gst_data['output_tax'],
        'input_tax': gst_data['input_tax'],
        'net_tax': gst_data['net_tax'],
    }
    serializer = GSTCalculationResponseSerializer(payload)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def generate_client_gstr3b(request, client_id):
    client = _get_client_for_user(request.user, client_id)
    if not client:
        return Response({'error': 'Client not found or access denied'}, status=status.HTTP_404_NOT_FOUND)

    period = request.query_params.get('period')
    gst_transactions = GSTTransaction.objects.filter(client=client)

    if period:
        period_dt = _parse_period(period)
        if not period_dt:
            return Response({'error': 'Invalid period. Use YYYY-MM format'}, status=status.HTTP_400_BAD_REQUEST)
        gst_transactions = gst_transactions.filter(date__year=period_dt.year, date__month=period_dt.month)
    else:
        period = 'all'

    # Primary source: compliance GST transactions (accounting_transactions)
    # Fallback source: main app transactions table (transactions), used by most existing flows.
    if gst_transactions.exists():
        gst_data = _compute_gst_data(gst_transactions)
        transaction_count = gst_transactions.count()
    else:
        from apps.transactions.models import Transaction as AppTransaction

        source_user = None
        if request.user.role == 'SME':
            source_user = request.user
        elif request.user.role == 'CA':
            relationship = ClientRelationship.objects.filter(
                ca=request.user,
                sme__email__iexact=client.email,
                is_active=True,
            ).select_related('sme').first()
            if relationship:
                source_user = relationship.sme

        app_transactions = AppTransaction.objects.none()
        if source_user:
            app_transactions = AppTransaction.objects.filter(user=source_user, status='approved')
            if period != 'all':
                app_transactions = app_transactions.filter(
                    date__year=period_dt.year,
                    date__month=period_dt.month,
                )

        outward = app_transactions.filter(type='income').aggregate(
            taxable=Sum('amount'),
            cgst=Sum('cgst_amount'),
            sgst=Sum('sgst_amount'),
            igst=Sum('igst_amount'),
        )
        inward = app_transactions.filter(type='expense').aggregate(
            taxable=Sum('amount'),
            cgst=Sum('cgst_amount'),
            sgst=Sum('sgst_amount'),
            igst=Sum('igst_amount'),
        )

        output_tax = (outward['cgst'] or Decimal('0.00')) + (outward['sgst'] or Decimal('0.00')) + (outward['igst'] or Decimal('0.00'))
        input_tax = (inward['cgst'] or Decimal('0.00')) + (inward['sgst'] or Decimal('0.00')) + (inward['igst'] or Decimal('0.00'))

        gst_data = {
            'output_tax': output_tax,
            'input_tax': input_tax,
            'net_tax': output_tax - input_tax,
            'outward_taxable': outward['taxable'] or Decimal('0.00'),
            'inward_taxable': inward['taxable'] or Decimal('0.00'),
        }
        transaction_count = app_transactions.count()

    gstr3b_payload = {
        'client_id': client.id,
        'period': period,
        'outward_supplies': {
            'taxable_value': gst_data['outward_taxable'],
            'output_tax': gst_data['output_tax'],
        },
        'inward_supplies': {
            'taxable_value': gst_data['inward_taxable'],
            'input_tax': gst_data['input_tax'],
        },
        'tax_liability': {
            'output_tax': gst_data['output_tax'],
            'input_tax_credit': gst_data['input_tax'],
            'net_tax_payable': gst_data['net_tax'],
        },
        'transaction_count': transaction_count,
    }

    serializer = GSTR3BResponseSerializer(gstr3b_payload)
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def itr_calculate_and_file(request):
    serializer = ITRCalculationInputSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    data = serializer.validated_data
    client = _get_client_for_user(request.user, data['client_id'])
    if not client:
        return Response({'error': 'Client not found or access denied'}, status=status.HTTP_404_NOT_FOUND)

    salary_income = data['salary_income']
    business_income = data['business_income']
    other_income = data['other_income']
    ded_80c = data['deductions_80c']
    ded_80d = data['deductions_80d']
    ded_other = data['deductions_other']
    tds_paid = data['tds_paid']

    total_income = (salary_income + business_income + other_income).quantize(Decimal('0.01'))
    total_deductions = (ded_80c + ded_80d + ded_other).quantize(Decimal('0.01'))
    taxable_income = max(total_income - total_deductions, Decimal('0.00')).quantize(Decimal('0.01'))
    tax_payable = _compute_itr_tax(taxable_income)

    net_after_tds = (tax_payable - tds_paid).quantize(Decimal('0.01'))
    if net_after_tds < 0:
        refund_amount = abs(net_after_tds)
        payable_amount = Decimal('0.00')
    else:
        refund_amount = Decimal('0.00')
        payable_amount = net_after_tds

    itr_record, _ = ITRRecord.objects.update_or_create(
        client=client,
        assessment_year=data['assessment_year'],
        defaults={
            'salary_income': salary_income,
            'business_income': business_income,
            'other_income': other_income,
            'deductions': total_deductions,
            'taxable_income': taxable_income,
            'tax_payable': tax_payable,
            'tds_paid': tds_paid,
            'status': 'draft',
        }
    )

    itr_json = {
        'client_id': client.id,
        'assessment_year': data['assessment_year'],
        'pan': client.pan,
        'income_breakdown': {
            'salary': float(salary_income),
            'business': float(business_income),
            'other': float(other_income),
            'total_income': float(total_income),
        },
        'deductions': {
            '80C': float(ded_80c),
            '80D': float(ded_80d),
            'others': float(ded_other),
            'total_deductions': float(total_deductions),
        },
        'taxable_income': float(taxable_income),
        'tax_payable': float(tax_payable),
        'tds_paid': float(tds_paid),
        'refund_or_payable': {
            'refund': float(refund_amount),
            'payable': float(payable_amount),
        },
    }

    result = {
        'client_id': client.id,
        'assessment_year': data['assessment_year'],
        'pan': client.pan,
        'total_income': total_income,
        'deductions': {
            '80C': ded_80c,
            '80D': ded_80d,
            'others': ded_other,
            'total_deductions': total_deductions,
        },
        'taxable_income': taxable_income,
        'tax_payable': tax_payable,
        'tds_paid': tds_paid,
        'refund_or_payable': {
            'refund': refund_amount,
            'payable': payable_amount,
        },
        'itr_json': itr_json,
        'record_id': itr_record.id,
    }

    AuditLog.objects.create(
        user=request.user,
        action='CREATE',
        resource='itr_calculation',
        resource_id=str(itr_record.id),
        details={
            'client_id': client.id,
            'assessment_year': data['assessment_year'],
            'taxable_income': float(taxable_income),
            'tax_payable': float(tax_payable),
        }
    )

    response_serializer = ITRCalculationResultSerializer(result)
    return Response(response_serializer.data, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def itr_records_by_client(request, client_id):
    client = _get_client_for_user(request.user, client_id)
    if not client:
        return Response({'error': 'Client not found or access denied'}, status=status.HTTP_404_NOT_FOUND)

    records = ITRRecord.objects.filter(client=client).order_by('-assessment_year', '-created_at')
    serializer = ITRRecordSerializer(records, many=True)
    return Response({'results': serializer.data, 'count': records.count()})


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def itr_client_summary(request, record_id):
    try:
        record = ITRRecord.objects.select_related('client').get(id=record_id, client__user=request.user)
    except ITRRecord.DoesNotExist:
        return Response({'error': 'ITR record not found or access denied'}, status=status.HTTP_404_NOT_FOUND)

    total_income = (record.salary_income + record.business_income + record.other_income).quantize(Decimal('0.01'))
    net_after_tds = (record.tax_payable - record.tds_paid).quantize(Decimal('0.01'))
    refund = abs(net_after_tds) if net_after_tds < 0 else Decimal('0.00')
    payable = net_after_tds if net_after_tds > 0 else Decimal('0.00')

    summary_text = (
        f"For AY {record.assessment_year}, total income is ₹{total_income}, taxable income is ₹{record.taxable_income}. "
        f"Calculated tax is ₹{record.tax_payable}. TDS paid is ₹{record.tds_paid}. "
        f"Refund due is ₹{refund} and additional payable is ₹{payable}."
    )

    payload = {
        'client_name': record.client.name,
        'pan': record.client.pan,
        'assessment_year': record.assessment_year,
        'income_breakdown': {
            'salary': record.salary_income,
            'business': record.business_income,
            'other': record.other_income,
            'total': total_income,
        },
        'deductions': {
            'total_deductions': record.deductions,
        },
        'taxable_income': record.taxable_income,
        'tax_payable': record.tax_payable,
        'tds_paid': record.tds_paid,
        'refund_or_payable': {
            'refund': refund,
            'payable': payable,
        },
        'plain_language_summary': summary_text,
    }
    serializer = ITRClientSummarySerializer(payload)
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def tds_calculate_and_save(request):
    serializer = TDSCalculationInputSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    data = serializer.validated_data
    client = _get_client_for_user(request.user, data['client_id'])
    if not client:
        return Response({'error': 'Client not found or access denied'}, status=status.HTTP_404_NOT_FOUND)

    amount = data['amount']
    payment_type = data['payment_type']
    pan_available = data['pan_available']
    tds_rate = _get_tds_rate(payment_type, pan_available)
    tds_deducted = ((amount * tds_rate) / Decimal('100')).quantize(Decimal('0.01'))

    record = TDSRecord.objects.create(
        client=client,
        payment_type=payment_type,
        section=payment_type,
        pan_available=pan_available,
        tds_rate=tds_rate,
        amount=amount,
        tds_deducted=tds_deducted,
        date=data.get('date') or date.today(),
    )

    AuditLog.objects.create(
        user=request.user,
        action='CREATE',
        resource='tds_record',
        resource_id=str(record.id),
        details={
            'client_id': client.id,
            'payment_type': payment_type,
            'pan_available': pan_available,
            'amount': float(amount),
            'tds_rate': float(tds_rate),
            'tds_deducted': float(tds_deducted),
        }
    )

    response_payload = {
        'client_id': client.id,
        'payment_type': payment_type,
        'section': payment_type,
        'pan_available': pan_available,
        'amount': amount,
        'tds_rate': tds_rate,
        'tds_deducted': tds_deducted,
        'record_id': record.id,
    }
    response_serializer = TDSCalculationResponseSerializer(response_payload)
    return Response(response_serializer.data, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def tds_records_by_client(request, client_id):
    client = _get_client_for_user(request.user, client_id)
    if not client or not _can_access_client(request.user, client):
        return Response({'error': 'Client not found or access denied'}, status=status.HTTP_404_NOT_FOUND)

    records = TDSRecord.objects.filter(client=client).order_by('-date', '-created_at')
    serializer = TDSRecordSerializer(records, many=True)
    total_tds = records.aggregate(total=Sum('tds_deducted'))['total'] or Decimal('0.00')
    return Response({
        'client_id': client.id,
        'results': serializer.data,
        'count': records.count(),
        'total_tds_deducted': total_tds,
    })


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def generate_pnl_report(request, client_id):
    client = _get_client_for_user(request.user, client_id)
    if not client:
        return Response({'error': 'Client not found or access denied'}, status=status.HTTP_404_NOT_FOUND)

    transactions = GSTTransaction.objects.filter(client=client)
    total_sales = transactions.filter(type='sale').aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
    total_expenses = transactions.filter(type='purchase').aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
    net_profit = (total_sales - total_expenses).quantize(Decimal('0.01'))

    filename, file_bytes = _build_pnl_file(client, total_sales, total_expenses, net_profit)

    report = Report.objects.create(
        client=client,
        report_type='profit_loss'
    )
    report.file.save(filename, ContentFile(file_bytes), save=True)

    AuditLog.objects.create(
        user=request.user,
        action='CREATE',
        resource='pnl_report',
        resource_id=str(report.id),
        details={
            'client_id': client.id,
            'total_sales': float(total_sales),
            'total_expenses': float(total_expenses),
            'net_profit': float(net_profit),
            'file_name': filename,
        }
    )

    file_url = request.build_absolute_uri(report.file.url) if report.file else None

    payload = {
        'client_id': client.id,
        'report_id': report.id,
        'report_type': report.report_type,
        'total_sales': total_sales,
        'total_expenses': total_expenses,
        'net_profit': net_profit,
        'generated_at': report.created_at,
        'file_url': file_url,
    }
    serializer = PnLReportResponseSerializer(payload)
    return Response(serializer.data, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def reports_by_client(request, client_id):
    client = _get_client_for_user(request.user, client_id)
    if not client:
        return Response({'error': 'Client not found or access denied'}, status=status.HTTP_404_NOT_FOUND)

    reports = Report.objects.filter(client=client).order_by('-created_at')
    serializer = ReportSerializer(reports, many=True, context={'request': request})
    return Response({'client_id': client.id, 'results': serializer.data, 'count': reports.count()})


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def send_message(request):
    serializer = MessageSendSerializer(data=request.data, context={'request': request})
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    data = serializer.validated_data
    client = data['client']
    report = data.get('report')

    if not _can_access_client(request.user, client):
        return Response({'error': 'Client not found or access denied'}, status=status.HTTP_404_NOT_FOUND)

    message = Message.objects.create(
        client=client,
        sender=request.user,
        report=report,
        message_text=data.get('message_text', '').strip() or (
            f"Shared report: {report.get_report_type_display()}" if report else 'File shared'
        ),
        file_attachment=data.get('file_attachment') or (report.file if report and report.file else None)
    )

    AuditLog.objects.create(
        user=request.user,
        action='CREATE',
        resource='client_message',
        resource_id=str(message.id),
        details={
            'client_id': client.id,
            'report_id': report.id if report else None,
            'has_attachment': bool(message.file_attachment),
        }
    )

    return Response(MessageSerializer(message, context={'request': request}).data, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def get_client_messages(request, client_id):
    client = _resolve_client_for_user(request.user, client_id)
    if not client:
        return Response({'error': 'Client not found or access denied'}, status=status.HTTP_404_NOT_FOUND)

    messages = Message.objects.filter(client=client).select_related('sender', 'report').order_by('timestamp')
    serialized = MessageSerializer(messages, many=True, context={'request': request})
    return Response({'client_id': client.id, 'results': serialized.data, 'count': messages.count()})

class ComplianceCalendarView(generics.ListAPIView):
    serializer_class = ComplianceCalendarSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        queryset = ComplianceCalendar.objects.filter(user=self.request.user)

        if not queryset.exists():
            today = date.today()
            for rule in ComplianceRule.objects.filter(is_active=True):
                if rule.due_period == 'monthly':
                    due_date = today + timedelta(days=30)
                elif rule.due_period == 'quarterly':
                    due_date = today + timedelta(days=90)
                else:
                    due_date = today + timedelta(days=365)

                ComplianceCalendar.objects.get_or_create(
                    user=self.request.user,
                    rule=rule,
                    due_date=due_date,
                    defaults={
                        'title': rule.name,
                        'description': rule.description,
                    }
                )
            queryset = ComplianceCalendar.objects.filter(user=self.request.user)
        
        # Filter by completion status
        is_completed = self.request.query_params.get('completed')
        if is_completed is not None:
            queryset = queryset.filter(is_completed=is_completed.lower() == 'true')
        
        # Filter by date range
        date_from = self.request.query_params.get('date_from')
        date_to = self.request.query_params.get('date_to')
        
        if date_from:
            try:
                date_from = datetime.strptime(date_from, '%Y-%m-%d').date()
                queryset = queryset.filter(due_date__gte=date_from)
            except ValueError:
                pass
        
        if date_to:
            try:
                date_to = datetime.strptime(date_to, '%Y-%m-%d').date()
                queryset = queryset.filter(due_date__lte=date_to)
            except ValueError:
                pass
        
        return queryset

    def post(self, request, *args, **kwargs):
        serializer = ComplianceCalendarSerializer(data=request.data)
        if serializer.is_valid():
            item = serializer.save(user=request.user)
            return Response(ComplianceCalendarSerializer(item).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class NoticeListCreateView(generics.ListCreateAPIView):
    serializer_class = NoticeSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = Notice.objects.filter(client__user=self.request.user).select_related('client')
        client_identifier = self.request.query_params.get('client_id')
        if client_identifier:
            client = _resolve_client_for_user(self.request.user, client_identifier)
            if not client:
                return Notice.objects.none()
            queryset = queryset.filter(client=client)
        return queryset.order_by('-created_at')

    def perform_create(self, serializer):
        client_id = self.request.data.get('client') or self.request.data.get('client_id')
        client = _get_client_for_user(self.request.user, client_id)
        if not client:
            raise ValidationError({'client_id': 'Client not found or access denied'})
        serializer.save(client=client)


class NoticeDetailView(generics.RetrieveUpdateAPIView):
    serializer_class = NoticeSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Notice.objects.filter(client__user=self.request.user).select_related('client')

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def mark_compliance_completed(request, item_id):
    """Mark a compliance item as completed"""
    try:
        item = ComplianceCalendar.objects.get(id=item_id, user=request.user)
        item.is_completed = True
        item.completed_at = timezone.now()
        item.save()
        
        # Log the completion
        AuditLog.objects.create(
            user=request.user,
            action='UPDATE',
            resource='compliance_calendar',
            resource_id=str(item.id),
            details={'title': item.title, 'completed': True}
        )
        
        return Response({'message': 'Compliance item marked as completed'})
    
    except ComplianceCalendar.DoesNotExist:
        return Response({'error': 'Compliance item not found'}, 
                       status=status.HTTP_404_NOT_FOUND)

class GSTReturnListCreateView(generics.ListCreateAPIView):
    serializer_class = GSTReturnSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return GSTReturn.objects.filter(user=self.request.user)
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

class ITRFilingListCreateView(generics.ListCreateAPIView):
    serializer_class = ITRFilingSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return ITRFiling.objects.filter(user=self.request.user)
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def compliance_score(request):
    """Get user's compliance score"""
    score, created = ComplianceScore.objects.get_or_create(
        user=request.user,
        defaults={'overall_score': 100}
    )
    
    if created or (timezone.now() - score.last_calculated).days > 1:
        # Recalculate score
        score.calculate_score()
    
    serializer = ComplianceScoreSerializer(score)
    return Response(serializer.data)

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def calculate_tax(request):
    """Calculate income tax"""
    serializer = TaxCalculationSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    data = serializer.validated_data
    income = data['income_amount']
    deductions_80c = data['deductions_80c']
    deductions_80d = data['deductions_80d']
    other_deductions = data['other_deductions']
    
    # Calculate taxable income
    total_deductions = deductions_80c + deductions_80d + other_deductions
    taxable_income = max(income - total_deductions, 0)
    
    # Tax calculation for FY 2024-25 (New Tax Regime)
    tax_slabs = [
        (300000, 0),    # 0% up to 3L
        (300000, 0.05), # 5% from 3L to 6L
        (300000, 0.10), # 10% from 6L to 9L
        (300000, 0.15), # 15% from 9L to 12L
        (300000, 0.20), # 20% from 12L to 15L
        (float('inf'), 0.30) # 30% above 15L
    ]
    
    calculated_tax = 0
    remaining_income = float(taxable_income)
    
    for slab_limit, tax_rate in tax_slabs:
        if remaining_income <= 0:
            break
        
        taxable_in_slab = min(remaining_income, slab_limit)
        calculated_tax += taxable_in_slab * tax_rate
        remaining_income -= taxable_in_slab
    
    # Add cess (4% on income tax)
    cess = calculated_tax * 0.04
    total_tax = calculated_tax + cess
    
    result = {
        'gross_income': float(income),
        'total_deductions': float(total_deductions),
        'taxable_income': float(taxable_income),
        'income_tax': float(calculated_tax),
        'health_cess': float(cess),
        'total_tax_liability': float(total_tax),
        'effective_tax_rate': (float(total_tax) / float(income) * 100) if income > 0 else 0,
        'tax_saved_by_deductions': float((total_deductions * 0.30) if income > 1500000 else (total_deductions * 0.20))
    }
    
    return Response(result)

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def calculate_gst(request):
    """Calculate GST amounts"""
    serializer = GSTCalculationSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    data = serializer.validated_data
    taxable_amount = data['taxable_amount']
    gst_rate = data['gst_rate'] / 100  # Convert percentage to decimal
    transaction_type = data['transaction_type']
    
    if transaction_type == 'intrastate':
        # CGST + SGST
        cgst = taxable_amount * (gst_rate / 2)
        sgst = taxable_amount * (gst_rate / 2)
        igst = 0
    else:
        # IGST
        cgst = 0
        sgst = 0
        igst = taxable_amount * gst_rate
    
    total_gst = cgst + sgst + igst
    total_amount = taxable_amount + total_gst
    
    result = {
        'taxable_amount': float(taxable_amount),
        'gst_rate': float(data['gst_rate']),
        'cgst_amount': float(cgst),
        'sgst_amount': float(sgst),
        'igst_amount': float(igst),
        'total_gst': float(total_gst),
        'total_amount': float(total_amount),
        'transaction_type': transaction_type
    }
    
    return Response(result)

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def compliance_dashboard(request):
    """Get compliance dashboard data"""
    user = request.user
    today = date.today()
    
    # Upcoming compliance items
    upcoming_items = ComplianceCalendar.objects.filter(
        user=user,
        due_date__gte=today,
        is_completed=False
    ).order_by('due_date')[:5]
    
    # Overdue items
    overdue_items = ComplianceCalendar.objects.filter(
        user=user,
        due_date__lt=today,
        is_completed=False
    ).count()
    
    # Recent GST returns
    recent_gst = GSTReturn.objects.filter(user=user).order_by('-created_at')[:3]
    
    # Recent ITR filings
    recent_itr = ITRFiling.objects.filter(user=user).order_by('-created_at')[:3]
    
    # Compliance score
    score, _ = ComplianceScore.objects.get_or_create(
        user=user,
        defaults={'overall_score': 100}
    )
    
    dashboard_data = {
        'compliance_score': ComplianceScoreSerializer(score).data,
        'upcoming_items': ComplianceCalendarSerializer(upcoming_items, many=True).data,
        'overdue_count': overdue_items,
        'recent_gst_returns': GSTReturnSerializer(recent_gst, many=True).data,
        'recent_itr_filings': ITRFilingSerializer(recent_itr, many=True).data,
        'summary': {
            'total_pending': upcoming_items.count() + overdue_items,
            'completed_this_month': ComplianceCalendar.objects.filter(
                user=user,
                completed_at__month=today.month,
                completed_at__year=today.year
            ).count()
        }
    }
    
    return Response(dashboard_data)

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def generate_gstr3b_data(request):
    """Generate GSTR-3B data from transactions"""
    period = request.data.get('period')  # Accepts YYYY-MM or MM-YYYY format
    client_id = request.data.get('client_id')  # Optional: for CA users to access client data
    
    if not period:
        return Response({'error': 'Period is required'}, 
                       status=status.HTTP_400_BAD_REQUEST)
    
    # Parse period - handle both YYYY-MM and MM-YYYY formats
    try:
        parts = period.split('-')
        if len(parts) != 2:
            raise ValueError("Invalid format")
        
        # Try YYYY-MM format first (most common)
        try:
            year = int(parts[0])
            month = int(parts[1])
            # If year > 12, it's YYYY-MM format
            if year > 12:
                pass  # Already correct
            else:
                # It's MM-YYYY format, swap them
                month, year = year, month
        except ValueError:
            raise ValueError("Invalid period format")
            
        # Validate month
        if month < 1 or month > 12:
            raise ValueError("Invalid month")
            
    except (ValueError, IndexError):
        return Response({'error': 'Invalid period format. Use YYYY-MM or MM-YYYY'}, 
                       status=status.HTTP_400_BAD_REQUEST)
    
    # Get user's transactions for the period
    from apps.transactions.models import Transaction
    
    # Determine which user's transactions to fetch
    target_user = request.user
    if client_id and request.user.role == 'CA':
        # CA accessing client data
        try:
            from django.contrib.auth import get_user_model
            User = get_user_model()
            client_user = User.objects.get(id=client_id, role='SME')
            client_rel = ClientRelationship.objects.get(
                ca=request.user,
                sme=client_user,
                is_active=True
            )
            target_user = client_user
        except (ClientRelationship.DoesNotExist, User.DoesNotExist):
            return Response({'error': 'Client not found or access denied'}, 
                           status=status.HTTP_404_NOT_FOUND)
    
    transactions = Transaction.objects.filter(
        user=target_user,
        date__year=year,
        date__month=month,
        status='approved'
    )
    
    # Calculate GST summary
    outward_supplies = transactions.filter(type='income').aggregate(
        taxable_value=Sum('amount'),
        cgst=Sum('cgst_amount'),
        sgst=Sum('sgst_amount'),
        igst=Sum('igst_amount')
    )
    
    inward_supplies = transactions.filter(type='expense').aggregate(
        taxable_value=Sum('amount'),
        cgst=Sum('cgst_amount'),
        sgst=Sum('sgst_amount'),
        igst=Sum('igst_amount')
    )
    
    # Calculate net GST liability
    output_tax = (
        (outward_supplies['cgst'] or 0) + 
        (outward_supplies['sgst'] or 0) + 
        (outward_supplies['igst'] or 0)
    )
    
    input_tax = (
        (inward_supplies['cgst'] or 0) + 
        (inward_supplies['sgst'] or 0) + 
        (inward_supplies['igst'] or 0)
    )
    
    net_liability = max(output_tax - input_tax, 0)
    
    gstr3b_data = {
        'period': period,
        'outward_supplies': {
            'taxable_value': float(outward_supplies['taxable_value'] or 0),
            'cgst': float(outward_supplies['cgst'] or 0),
            'sgst': float(outward_supplies['sgst'] or 0),
            'igst': float(outward_supplies['igst'] or 0)
        },
        'inward_supplies': {
            'taxable_value': float(inward_supplies['taxable_value'] or 0),
            'cgst': float(inward_supplies['cgst'] or 0),
            'sgst': float(inward_supplies['sgst'] or 0),
            'igst': float(inward_supplies['igst'] or 0)
        },
        'tax_liability': {
            'output_tax': float(output_tax),
            'input_tax_credit': float(input_tax),
            'net_tax_payable': float(net_liability)
        },
        'transaction_count': transactions.count()
    }
    
    return Response(gstr3b_data)