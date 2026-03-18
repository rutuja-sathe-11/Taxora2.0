from rest_framework import generics, status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.db.models import Q, Sum, Count
from django.db.models.functions import TruncMonth
from django.utils.dateparse import parse_date
from .models import Transaction, TransactionCategory, BankAccount
from .serializers import (
    TransactionSerializer, TransactionCreateSerializer, 
    TransactionCategorySerializer, BankAccountSerializer,
    TransactionSummarySerializer
)
from apps.users.models import AuditLog
from apps.ai_services.tasks import analyze_transaction_task

import csv
from django.http import HttpResponse
from datetime import datetime, timedelta
from django.utils import timezone
from calendar import month_abbr

class TransactionListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated]
    
    def get_serializer_class(self):
        if self.request.method == 'POST':
            return TransactionCreateSerializer
        return TransactionSerializer
    
    def get_queryset(self):
        queryset = Transaction.objects.filter(user=self.request.user)
        
        # Filtering
        transaction_type = self.request.query_params.get('type')
        status_filter = self.request.query_params.get('status')
        category = self.request.query_params.get('category')
        date_from = self.request.query_params.get('date_from')
        date_to = self.request.query_params.get('date_to')
        search = self.request.query_params.get('search')
        
        if transaction_type:
            queryset = queryset.filter(type=transaction_type)
        
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        if category:
            queryset = queryset.filter(category__icontains=category)
        
        if date_from:
            date_from = parse_date(date_from)
            if date_from:
                queryset = queryset.filter(date__gte=date_from)
        
        if date_to:
            date_to = parse_date(date_to)
            if date_to:
                queryset = queryset.filter(date__lte=date_to)
        
        if search:
            queryset = queryset.filter(
                Q(description__icontains=search) |
                Q(vendor_name__icontains=search) |
                Q(invoice_number__icontains=search)
            )
        
        return queryset.select_related('reviewed_by').prefetch_related('documents')
    
    def perform_create(self, serializer):
        transaction = serializer.save()
        
        # Log transaction creation
        AuditLog.objects.create(
            user=self.request.user,
            action='CREATE',
            resource='transaction',
            resource_id=str(transaction.id),
            details={
                'description': transaction.description,
                'amount': float(transaction.amount),
                'type': transaction.type
            }
        )
        
        # Trigger AI analysis
        analyze_transaction_task(str(transaction.id))

class TransactionDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = TransactionSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return Transaction.objects.filter(user=self.request.user)

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def transaction_summary(request):
    """Get transaction summary and analytics"""
    # Support CA users viewing client data
    client_id = request.query_params.get('client_id')
    
    # Determine which transactions to query
    if request.user.role == 'CA' and client_id:
        # CA accessing specific client data
        from apps.users.models import ClientRelationship
        from django.contrib.auth import get_user_model
        User = get_user_model()
        try:
            client_user = User.objects.get(id=client_id, role='SME')
            client_rel = ClientRelationship.objects.get(
                ca=request.user,
                sme=client_user,
                is_active=True
            )
            user_transactions = Transaction.objects.filter(user=client_user)
        except (ClientRelationship.DoesNotExist, User.DoesNotExist):
            return Response({'error': 'Client not found or access denied'}, 
                           status=status.HTTP_404_NOT_FOUND)
    elif request.user.role == 'CA' and not client_id:
        # CA viewing all clients' data
        from apps.users.models import ClientRelationship
        client_relationships = ClientRelationship.objects.filter(
            ca=request.user, is_active=True
        ).values_list('sme', flat=True)
        user_transactions = Transaction.objects.filter(user__in=client_relationships)
    else:
        # Regular user or SME viewing their own data
        user_transactions = Transaction.objects.filter(user=request.user)
    
    # Date filtering for summary
    date_from = request.query_params.get('date_from')
    date_to = request.query_params.get('date_to')
    
    if date_from:
        date_from = parse_date(date_from)
        if date_from:
            user_transactions = user_transactions.filter(date__gte=date_from)
    
    if date_to:
        date_to = parse_date(date_to)
        if date_to:
            user_transactions = user_transactions.filter(date__lte=date_to)
    
    # Calculate summary
    income_transactions = user_transactions.filter(type='income')
    income_count = income_transactions.count()
    
    # Debug: Log all income transactions for troubleshooting
    import logging
    logger = logging.getLogger(__name__)
    if income_count > 0:
        income_list = list(income_transactions.values('id', 'description', 'amount', 'status', 'date'))
        logger.info(f"User {request.user.id}: Found {income_count} income transactions: {income_list}")
    else:
        # Check what transaction types exist
        type_counts = user_transactions.values('type').annotate(count=Count('id'))
        logger.info(f"User {request.user.id}: No income transactions found. Transaction types: {list(type_counts)}")
    
    income_sum_result = income_transactions.aggregate(total=Sum('amount'))
    income_sum = float(income_sum_result['total'] or 0)
    
    logger.info(f"User {request.user.id}: Total transactions={user_transactions.count()}, "
                f"Income transactions={income_count}, Income sum={income_sum}")
    
    expense_sum_result = user_transactions.filter(type='expense').aggregate(total=Sum('amount'))
    expense_sum = float(expense_sum_result['total'] or 0)
    
    # Fix GST calculation - calculate each GST component separately and sum them
    income_gst_result = user_transactions.filter(type='income').aggregate(
        cgst=Sum('cgst_amount'),
        sgst=Sum('sgst_amount'),
        igst=Sum('igst_amount')
    )
    gst_collected = float(income_gst_result['cgst'] or 0) + float(income_gst_result['sgst'] or 0) + float(income_gst_result['igst'] or 0)
    
    expense_gst_result = user_transactions.filter(type='expense').aggregate(
        cgst=Sum('cgst_amount'),
        sgst=Sum('sgst_amount'),
        igst=Sum('igst_amount')
    )
    gst_paid = float(expense_gst_result['cgst'] or 0) + float(expense_gst_result['sgst'] or 0) + float(expense_gst_result['igst'] or 0)
    
    tds_result = user_transactions.aggregate(total=Sum('tds_amount'))
    tds_total = float(tds_result['total'] or 0)
    
    # Calculate monthly revenue (current month, approved transactions only)
    from django.utils import timezone
    month_start = timezone.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    monthly_revenue = user_transactions.filter(
        type='income',
        status='approved',
        date__gte=month_start
    ).aggregate(total=Sum('amount'))['total'] or 0
    
    summary_data = {
        'total_income': income_sum,
        'total_expenses': expense_sum,
        'net_profit': income_sum - expense_sum,
        'monthly_revenue': float(monthly_revenue),
        'total_gst_collected': gst_collected,
        'total_gst_paid': gst_paid,
        'total_tds': tds_total,
        'transaction_count': user_transactions.count(),
        'pending_reviews': user_transactions.filter(status='pending').count(),
    }
    
    serializer = TransactionSummarySerializer(summary_data)
    return Response(serializer.data)

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def export_transactions(request):
    """Export transactions to CSV"""
    # Support CA users viewing client data
    client_id = request.query_params.get('client_id')
    
    # Determine which transactions to query
    if request.user.role == 'CA' and client_id:
        # CA accessing specific client data
        from apps.users.models import ClientRelationship
        from django.contrib.auth import get_user_model
        User = get_user_model()
        try:
            client_user = User.objects.get(id=client_id, role='SME')
            client_rel = ClientRelationship.objects.get(
                ca=request.user,
                sme=client_user,
                is_active=True
            )
            queryset = Transaction.objects.filter(user=client_user).order_by('-date')
        except (ClientRelationship.DoesNotExist, User.DoesNotExist):
            return Response({'error': 'Client not found or access denied'}, 
                           status=status.HTTP_404_NOT_FOUND)
    elif request.user.role == 'CA' and not client_id:
        # CA viewing all clients' data
        from apps.users.models import ClientRelationship
        client_relationships = ClientRelationship.objects.filter(
            ca=request.user, is_active=True
        ).values_list('sme', flat=True)
        queryset = Transaction.objects.filter(user__in=client_relationships).order_by('-date')
    else:
        # Regular user or SME viewing their own data
        queryset = Transaction.objects.filter(user=request.user).order_by('-date')
    
    # Apply same filters as list view
    transaction_type = request.query_params.get('type')
    status_filter = request.query_params.get('status')
    date_from = request.query_params.get('date_from')
    date_to = request.query_params.get('date_to')
    
    if transaction_type:
        queryset = queryset.filter(type=transaction_type)
    
    if status_filter:
        queryset = queryset.filter(status=status_filter)
    
    if date_from:
        date_from = parse_date(date_from)
        if date_from:
            queryset = queryset.filter(date__gte=date_from)
    
    if date_to:
        date_to = parse_date(date_to)
        if date_to:
            queryset = queryset.filter(date__lte=date_to)
    
    # Create CSV response
    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = 'attachment; filename="transactions.csv"'
    
    writer = csv.writer(response)
    writer.writerow([
        'Date', 'Description', 'Amount', 'Type', 'Category', 'Status',
        'Invoice Number', 'Vendor Name', 'GST Number', 'CGST', 'SGST', 
        'IGST', 'TDS', 'Total Tax', 'Net Amount'
    ])
    
    for transaction in queryset:
        writer.writerow([
            transaction.date,
            transaction.description,
            transaction.amount,
            transaction.type,
            transaction.category,
            transaction.status,
            transaction.invoice_number,
            transaction.vendor_name,
            transaction.gst_number,
            transaction.cgst_amount,
            transaction.sgst_amount,
            transaction.igst_amount,
            transaction.tds_amount,
            transaction.total_tax_amount,
            transaction.net_amount,
        ])
    
    return response

class TransactionCategoryListView(generics.ListAPIView):
    serializer_class = TransactionCategorySerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = TransactionCategory.objects.filter(is_active=True)

class BankAccountListCreateView(generics.ListCreateAPIView):
    serializer_class = BankAccountSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return BankAccount.objects.filter(user=self.request.user)

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def ca_client_transactions(request):
    """CA users can view all transactions from their clients"""
    if request.user.role != 'CA':
        return Response({'error': 'Only CAs can access this endpoint'}, 
                       status=status.HTTP_403_FORBIDDEN)
    
    from apps.users.models import ClientRelationship
    
    # Get all active client relationships
    client_relationships = ClientRelationship.objects.filter(
        ca=request.user, is_active=True
    ).values_list('sme', flat=True)
    
    # Get transactions from all clients
    queryset = Transaction.objects.filter(user__in=client_relationships)
    
    # Filter by status (for review queue)
    status_filter = request.query_params.get('status')
    if status_filter:
        if status_filter == 'pending_review':
            queryset = queryset.filter(status__in=['pending', 'flagged'])
        else:
            queryset = queryset.filter(status=status_filter)
    else:
        # Default to pending/flagged for review queue
        queryset = queryset.filter(status__in=['pending', 'flagged'])
    
    # Additional filters
    transaction_type = request.query_params.get('type')
    date_from = request.query_params.get('date_from')
    date_to = request.query_params.get('date_to')
    search = request.query_params.get('search')
    
    if transaction_type:
        queryset = queryset.filter(type=transaction_type)
    
    if date_from:
        date_from = parse_date(date_from)
        if date_from:
            queryset = queryset.filter(date__gte=date_from)
    
    if date_to:
        date_to = parse_date(date_to)
        if date_to:
            queryset = queryset.filter(date__lte=date_to)
    
    if search:
        queryset = queryset.filter(
            Q(description__icontains=search) |
            Q(vendor_name__icontains=search) |
            Q(invoice_number__icontains=search)
        )
    
    # Annotate with client information
    queryset = queryset.select_related('user', 'reviewed_by').prefetch_related('documents')
    
    # Serialize transactions (client info is already included in serializer)
    serializer = TransactionSerializer(queryset.order_by('-created_at'), many=True)
    transactions_data = serializer.data
    
    # Ensure client_name and client_business are set (they come from serializer now)
    for transaction_data in transactions_data:
        if 'client_name' not in transaction_data:
            transaction_data['client_name'] = transaction_data.get('user_name', 'Unknown')
        if 'client_business' not in transaction_data:
            transaction_data['client_business'] = transaction_data.get('user_business', 'Unknown Business')
    
    return Response({'results': transactions_data, 'count': len(transactions_data)})

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def ca_dashboard_summary(request):
    """Get CA dashboard summary with client statistics"""
    if request.user.role != 'CA':
        return Response({'error': 'Only CAs can access this endpoint'}, 
                       status=status.HTTP_403_FORBIDDEN)
    
    from apps.users.models import ClientRelationship
    
    # Get all active client relationships
    client_relationships = ClientRelationship.objects.filter(
        ca=request.user, is_active=True
    )
    
    client_ids = client_relationships.values_list('sme', flat=True)
    
    # Get all transactions from clients
    all_transactions = Transaction.objects.filter(user__in=client_ids)
    
    # Calculate statistics
    total_clients = client_relationships.count()
    pending_reviews = all_transactions.filter(status__in=['pending', 'flagged']).count()
    
    # Monthly revenue (current month, approved transactions only)
    from django.utils import timezone
    month_start = timezone.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    monthly_revenue = all_transactions.filter(
        type='income',
        status='approved',
        date__gte=month_start
    ).aggregate(total=Sum('amount'))['total'] or 0
    
    # Total transactions
    total_transactions = all_transactions.count()
    
    # Transactions by status
    approved_count = all_transactions.filter(status='approved').count()
    rejected_count = all_transactions.filter(status='rejected').count()
    flagged_count = all_transactions.filter(status='flagged').count()
    
    return Response({
        'total_clients': total_clients,
        'pending_reviews': pending_reviews,
        'monthly_revenue': float(monthly_revenue),
        'total_transactions': total_transactions,
        'approved_transactions': approved_count,
        'rejected_transactions': rejected_count,
        'flagged_transactions': flagged_count,
    })

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def review_transaction(request, transaction_id):
    """CA users can review and approve/reject transactions"""
    if request.user.role != 'CA':
        return Response({'error': 'Only CAs can review transactions'}, 
                       status=status.HTTP_403_FORBIDDEN)
    
    try:
        # CA should only review transactions of their clients
        from apps.users.models import ClientRelationship
        client_relationships = ClientRelationship.objects.filter(
            ca=request.user, is_active=True
        ).values_list('sme', flat=True)
        
        transaction = Transaction.objects.get(
            id=transaction_id, 
            user__in=client_relationships
        )
    except Transaction.DoesNotExist:
        return Response({'error': 'Transaction not found'}, 
                       status=status.HTTP_404_NOT_FOUND)
    
    new_status = request.data.get('status')
    review_notes = request.data.get('review_notes', '')
    
    if new_status not in ['approved', 'rejected', 'flagged']:
        return Response({'error': 'Invalid status'}, 
                       status=status.HTTP_400_BAD_REQUEST)
    
    transaction.status = new_status
    transaction.reviewed_by = request.user
    transaction.reviewed_at = datetime.now()
    transaction.review_notes = review_notes
    transaction.save()
    
    # Log the review
    AuditLog.objects.create(
        user=request.user,
        action='UPDATE',
        resource='transaction_review',
        resource_id=str(transaction.id),
        details={
            'status': new_status,
            'review_notes': review_notes,
            'transaction_owner': transaction.user.username
        }
    )
    
    return Response({'message': 'Transaction reviewed successfully'})

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def monthly_trends(request):
    """Get monthly income and expense trends for charts"""
    user_transactions = Transaction.objects.filter(user=request.user)
    
    # Get last 6 months of data
    six_months_ago = timezone.now() - timedelta(days=180)
    user_transactions = user_transactions.filter(date__gte=six_months_ago)
    
    # Group by month and type
    monthly_data = user_transactions.annotate(
        month=TruncMonth('date')
    ).values('month', 'type').annotate(
        total=Sum('amount')
    ).order_by('month')
    
    # Create a dictionary to store monthly totals with date for sorting
    months_dict = {}
    for item in monthly_data:
        month_date = item['month']
        month_key = month_date.strftime('%b')
        if month_key not in months_dict:
            months_dict[month_key] = {'income': 0, 'expenses': 0, 'date': month_date}
        
        if item['type'] == 'income':
            months_dict[month_key]['income'] = float(item['total'])
        else:
            months_dict[month_key]['expenses'] = float(item['total'])
    
    # Convert to list format and sort by date
    result = []
    for month, data in months_dict.items():
        result.append({
            'month': month,
            'income': data['income'],
            'expenses': data['expenses'],
            '_sort_date': data['date']  # For sorting
        })
    
    # Sort by date
    result.sort(key=lambda x: x['_sort_date'])
    # Remove sort key before returning
    for item in result:
        del item['_sort_date']
    
    return Response(result)

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def expense_breakdown(request):
    """Get expense breakdown by category for pie chart"""
    user_transactions = Transaction.objects.filter(
        user=request.user,
        type='expense'
    )
    
    # Group by category
    category_data = user_transactions.values('category').annotate(
        total=Sum('amount')
    ).order_by('-total')
    
    # Color palette for categories
    colors = ['#3B82F6', '#059669', '#D97706', '#DC2626', '#7C3AED', '#EC4899', '#14B8A6', '#F59E0B']
    
    result = []
    for idx, item in enumerate(category_data[:8]):  # Limit to top 8 categories
        result.append({
            'name': item['category'] or 'Uncategorized',
            'value': float(item['total']),
            'color': colors[idx % len(colors)]
        })
    
    return Response(result)

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def ca_client_growth_trends(request):
    """Get client growth and revenue trends for CA dashboard"""
    if request.user.role != 'CA':
        return Response({'error': 'Only CAs can access this endpoint'}, 
                       status=status.HTTP_403_FORBIDDEN)
    
    from apps.users.models import ClientRelationship
    
    # Get all active client relationships
    client_relationships = ClientRelationship.objects.filter(
        ca=request.user, is_active=True
    )
    client_ids = client_relationships.values_list('sme', flat=True)
    
    # Get transactions from all clients
    all_transactions = Transaction.objects.filter(user__in=client_ids)
    
    # Get last 6 months
    six_months_ago = timezone.now() - timedelta(days=180)
    all_transactions = all_transactions.filter(date__gte=six_months_ago)
    
    # Group by month for revenue
    monthly_revenue = all_transactions.filter(type='income').annotate(
        month=TruncMonth('date')
    ).values('month').annotate(
        revenue=Sum('amount')
    ).order_by('month')
    
    # Group by month for client count (based on when relationship was created)
    monthly_clients = client_relationships.annotate(
        month=TruncMonth('created_at')
    ).values('month').annotate(
        clients=Count('id')
    ).order_by('month')
    
    # Create a combined dictionary
    months_dict = {}
    
    # Add revenue data
    for item in monthly_revenue:
        month_key = item['month'].strftime('%b')
        if month_key not in months_dict:
            months_dict[month_key] = {'revenue': 0, 'clients': 0}
        months_dict[month_key]['revenue'] = float(item['revenue'])
    
    # Add client count (cumulative)
    cumulative_clients = 0
    for item in monthly_clients:
        month_key = item['month'].strftime('%b')
        cumulative_clients += item['clients']
        if month_key not in months_dict:
            months_dict[month_key] = {'revenue': 0, 'clients': cumulative_clients}
        else:
            months_dict[month_key]['clients'] = cumulative_clients
    
    # Fill in missing months with previous values and sort by date
    result = []
    last_client_count = 0
    
    # Create list with dates for sorting
    temp_result = []
    for month, data in months_dict.items():
        # Find the date from monthly_revenue or monthly_clients
        month_date = None
        for item in monthly_revenue:
            if item['month'].strftime('%b') == month:
                month_date = item['month']
                break
        if not month_date:
            for item in monthly_clients:
                if item['month'].strftime('%b') == month:
                    month_date = item['month']
                    break
        
        if data['clients'] == 0:
            data['clients'] = last_client_count
        else:
            last_client_count = data['clients']
        
        temp_result.append({
            'month': month,
            'revenue': data['revenue'],
            'clients': data['clients'],
            '_sort_date': month_date or timezone.now()
        })
    
    # Sort by date
    temp_result.sort(key=lambda x: x['_sort_date'])
    
    # Remove sort key
    for item in temp_result:
        del item['_sort_date']
        result.append(item)
    
    return Response(result)

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def ca_revenue_breakdown(request):
    """Get revenue breakdown by category for CA dashboard"""
    if request.user.role != 'CA':
        return Response({'error': 'Only CAs can access this endpoint'}, 
                       status=status.HTTP_403_FORBIDDEN)
    
    from apps.users.models import ClientRelationship
    
    # Get all active client relationships
    client_relationships = ClientRelationship.objects.filter(
        ca=request.user, is_active=True
    )
    client_ids = client_relationships.values_list('sme', flat=True)
    
    # Get income transactions from all clients
    income_transactions = Transaction.objects.filter(
        user__in=client_ids,
        type='income'
    )
    
    # Group by category
    category_data = income_transactions.values('category').annotate(
        total=Sum('amount')
    ).order_by('-total')
    
    # Color palette
    colors = ['#3B82F6', '#059669', '#D97706', '#DC2626', '#7C3AED', '#EC4899']
    
    result = []
    for idx, item in enumerate(category_data[:6]):  # Limit to top 6 categories
        result.append({
            'name': item['category'] or 'Other Services',
            'value': float(item['total']),
            'color': colors[idx % len(colors)]
        })
    
    # If no revenue data, return empty structure so graph can still render
    if not result:
        result = [
            {'name': 'No Revenue Data', 'value': 0, 'color': '#6B7280'}
        ]
    
    return Response(result)

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def ca_compliance_status(request):
    """Get compliance status breakdown for CA dashboard"""
    if request.user.role != 'CA':
        return Response({'error': 'Only CAs can access this endpoint'}, 
                       status=status.HTTP_403_FORBIDDEN)
    
    from apps.users.models import ClientRelationship
    from apps.compliance.models import ComplianceCalendar
    
    # Get all active client relationships
    client_relationships = ClientRelationship.objects.filter(
        ca=request.user, is_active=True
    )
    client_ids = client_relationships.values_list('sme', flat=True)
    
    # Get compliance calendar items for all clients
    compliance_items = ComplianceCalendar.objects.filter(user__in=client_ids)
    
    # Determine overdue items (due date passed and not completed)
    today = timezone.now().date()
    overdue_items = compliance_items.filter(due_date__lt=today, is_completed=False)
    pending_items = compliance_items.filter(due_date__gte=today, is_completed=False)
    completed_items = compliance_items.filter(is_completed=True)
    
    # Group by rule type
    from apps.compliance.models import ComplianceRule
    
    # Get rule types from rules
    rule_types = {}
    for item in compliance_items.select_related('rule'):
        rule_type = item.rule.rule_type if item.rule else 'other'
        rule_type_display = dict(ComplianceRule.RULE_TYPES).get(rule_type, rule_type.replace('_', ' ').title())
        
        if rule_type_display not in rule_types:
            rule_types[rule_type_display] = {'completed': 0, 'pending': 0, 'overdue': 0}
        
        if item.is_completed:
            rule_types[rule_type_display]['completed'] += 1
        elif item.due_date < today:
            rule_types[rule_type_display]['overdue'] += 1
        else:
            rule_types[rule_type_display]['pending'] += 1
    
    # Convert to list format
    result = []
    for rule_type, counts in rule_types.items():
        result.append({
            'type': rule_type,
            'completed': counts['completed'],
            'pending': counts['pending'],
            'overdue': counts['overdue']
        })
    
    # If no compliance data, return empty structure
    if not result:
        result = [
            {'type': 'GST Filing', 'completed': 0, 'pending': 0, 'overdue': 0},
            {'type': 'ITR Filing', 'completed': 0, 'pending': 0, 'overdue': 0},
            {'type': 'TDS Deduction', 'completed': 0, 'pending': 0, 'overdue': 0},
            {'type': 'Audit Requirement', 'completed': 0, 'pending': 0, 'overdue': 0}
        ]
    
    return Response(result)