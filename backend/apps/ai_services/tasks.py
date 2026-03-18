from django.utils import timezone
from datetime import timedelta
import logging
from .ai_utils import ai_advisor, compliance_analyzer
from apps.documents import processor as document_processor
from .models import AIInsight

logger = logging.getLogger(__name__)

def process_document(document_id: str) -> None:
    """Process uploaded document with OCR and AI"""
    try:
        from apps.documents.models import Document

        result = document_processor.process_document(document_id)
        document = Document.objects.get(id=document_id)

        if result.get("success"):
            # Generate lightweight AI summary (fallback-friendly)
            summary = ai_advisor.get_tax_advice(
                f"Summarize this {document.category} document for tax relevance.",
                {"document_data": result.get("parsed", {})},
            )
            document.ai_summary = summary
            document.save(update_fields=["ai_summary", "updated_at"])
            logger.info(f"Successfully processed document {document_id}")
        else:
            document.status = "failed"
            document.save(update_fields=["status"])
        
    except Exception as e:
        logger.error(f"Error processing document {document_id}: {e}")
        try:
            document = Document.objects.get(id=document_id)
            document.status = 'failed'
            document.save()
        except:
            pass

def analyze_transaction_task(transaction_id: str) -> None:
    """Analyze transaction for compliance and insights"""
    try:
        from apps.transactions.models import Transaction
        transaction = Transaction.objects.get(id=transaction_id)
        
        # Prepare transaction data for analysis
        transaction_data = {
            'amount': float(transaction.amount),
            'type': transaction.type,
            'category': transaction.category,
            'gst_number': transaction.gst_number,
            'cgst_amount': float(transaction.cgst_amount),
            'sgst_amount': float(transaction.sgst_amount),
            'igst_amount': float(transaction.igst_amount),
            'tds_amount': float(transaction.tds_amount),
        }
        
        # Analyze for compliance issues
        insights = compliance_analyzer.analyze_transaction(transaction_data)
        
        # Create AI insights
        for insight_data in insights:
            ai_insight = AIInsight.objects.create(
                user=transaction.user,
                insight_type=insight_data['type'],
                title=insight_data['title'],
                description=insight_data['description'],
                priority=insight_data['priority'],
                action_required=insight_data.get('action_required', False),
                confidence_score=0.85
            )
            ai_insight.related_transactions.add(transaction)
        
        # Update transaction with AI analysis
        if insights:
            analysis_text = f"Found {len(insights)} compliance points to review."
            anomaly_flags = [insight['type'] for insight in insights if insight['priority'] == 'high']
            
            transaction.ai_analysis = analysis_text
            transaction.anomaly_flags = anomaly_flags
            transaction.confidence_score = 0.9
            transaction.save()
        
        logger.info(f"Successfully analyzed transaction {transaction_id}")
        
    except Exception as e:
        logger.error(f"Error analyzing transaction {transaction_id}: {e}")

def generate_user_insights(user_id: str) -> None:
    """Generate personalized insights for user"""
    try:
        from django.contrib.auth import get_user_model
        from apps.transactions.models import Transaction
        from django.db.models import Sum
        from datetime import datetime, timedelta
        
        User = get_user_model()
        user = User.objects.get(id=user_id)
        
        # Get recent transactions
        last_month = timezone.now() - timedelta(days=30)
        recent_transactions = Transaction.objects.filter(
            user=user,
            created_at__gte=last_month
        )
        
        # Calculate expense trends
        total_expenses = recent_transactions.filter(type='expense').aggregate(
            total=Sum('amount'))['total'] or 0
        
        # Generate insights based on spending patterns
        insights_to_create = []
        
        # High expense alert
        if total_expenses > 100000:  # 1L+ expenses
            insights_to_create.append({
                'insight_type': 'expense_optimization',
                'title': 'High Monthly Expenses Detected',
                'description': f'Your expenses this month (₹{total_expenses:,.0f}) are significantly high. Review for optimization opportunities.',
                'priority': 'medium',
                'action_required': True
            })
        
        # GST credit opportunity
        gst_paid = recent_transactions.filter(type='expense').aggregate(
            cgst=Sum('cgst_amount'),
            sgst=Sum('sgst_amount'),
            igst=Sum('igst_amount')
        )
        total_gst_paid = (gst_paid['cgst'] or 0) + (gst_paid['sgst'] or 0) + (gst_paid['igst'] or 0)
        
        if total_gst_paid > 10000:
            insights_to_create.append({
                'insight_type': 'gst_credit',
                'title': 'GST Input Credit Available',
                'description': f'You have ₹{total_gst_paid:,.0f} in potential GST input credit this month. Ensure proper documentation.',
                'priority': 'medium',
                'action_required': False
            })
        
        # Create insights
        for insight_data in insights_to_create:
            AIInsight.objects.create(
                user=user,
                **insight_data,
                confidence_score=0.8,
                expires_at=timezone.now() + timedelta(days=30)
            )
        
        logger.info(f"Generated {len(insights_to_create)} insights for user {user_id}")
        
    except Exception as e:
        logger.error(f"Error generating insights for user {user_id}: {e}")

def cleanup_old_chat_sessions() -> None:
    """Clean up old inactive chat sessions"""
    try:
        from .models import ChatSession
        
        # Delete sessions older than 30 days that are inactive
        cutoff_date = timezone.now() - timedelta(days=30)
        old_sessions = ChatSession.objects.filter(
            is_active=False,
            updated_at__lt=cutoff_date
        )
        
        count = old_sessions.count()
        old_sessions.delete()
        
        logger.info(f"Cleaned up {count} old chat sessions")
        
    except Exception as e:
        logger.error(f"Error cleaning up chat sessions: {e}")

def send_compliance_reminders() -> None:
    """Send compliance reminders to users"""
    try:
        from django.contrib.auth import get_user_model
        from datetime import datetime
        
        User = get_user_model()
        users = User.objects.filter(is_active=True)
        
        current_date = timezone.now().date()
        
        for user in users:
            reminders = []
            
            # GST return reminder (20th of each month)
            if current_date.day == 18:  # 2 days before due date
                reminders.append({
                    'insight_type': 'compliance_reminder',
                    'title': 'GST Return Due Soon',
                    'description': 'GSTR-3B return is due on 20th. Prepare and file your GST return.',
                    'priority': 'high',
                    'action_required': True
                })
            
            # TDS return reminder (quarterly)
            if current_date.day == 28 and current_date.month in [1, 4, 7, 10]:
                reminders.append({
                    'insight_type': 'compliance_reminder',
                    'title': 'TDS Return Due',
                    'description': 'Quarterly TDS return is due on 31st. File Form 24Q/26Q.',
                    'priority': 'high',
                    'action_required': True
                })
            
            # Create reminder insights
            for reminder in reminders:
                AIInsight.objects.create(
                    user=user,
                    **reminder,
                    confidence_score=1.0,
                    expires_at=timezone.now() + timedelta(days=7)
                )
        
        logger.info(f"Sent compliance reminders to {len(users)} users")
        
    except Exception as e:
        logger.error(f"Error sending compliance reminders: {e}")