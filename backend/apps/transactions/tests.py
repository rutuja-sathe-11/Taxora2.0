from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta
from rest_framework.test import APIClient

from apps.users.models import ClientRelationship
from .models import Transaction


User = get_user_model()


class MonthlyRevenueCalculationTests(TestCase):
    def setUp(self):
        self.sme = User.objects.create_user(
            username='sme_txn',
            email='sme_txn@test.com',
            password='password',
            role='SME',
            is_active=True,
        )
        self.ca = User.objects.create_user(
            username='ca_txn',
            email='ca_txn@test.com',
            password='password',
            role='CA',
            is_active=True,
        )
        ClientRelationship.objects.create(ca=self.ca, sme=self.sme, is_active=True)

        self.client = APIClient()
        self.today = timezone.now().date()

    def test_transaction_summary_monthly_revenue_uses_pending_and_flagged(self):
        Transaction.objects.create(
            user=self.sme,
            date=self.today,
            description='Pending income',
            amount=1000,
            type='income',
            category='Sales',
            status='pending',
        )
        Transaction.objects.create(
            user=self.sme,
            date=self.today,
            description='Flagged income',
            amount=2000,
            type='income',
            category='Sales',
            status='flagged',
        )
        Transaction.objects.create(
            user=self.sme,
            date=self.today,
            description='Rejected income',
            amount=5000,
            type='income',
            category='Sales',
            status='rejected',
        )

        self.client.force_authenticate(user=self.sme)
        response = self.client.get('/api/transactions/summary/')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(float(response.data['monthly_revenue']), 3000.0)

    def test_ca_dashboard_monthly_revenue_uses_client_real_values(self):
        Transaction.objects.create(
            user=self.sme,
            date=self.today,
            description='Approved income',
            amount=4000,
            type='income',
            category='Consulting',
            status='approved',
        )
        Transaction.objects.create(
            user=self.sme,
            date=self.today,
            description='Pending income',
            amount=1500,
            type='income',
            category='Consulting',
            status='pending',
        )

        self.client.force_authenticate(user=self.ca)
        response = self.client.get('/api/transactions/ca/dashboard-summary/')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(float(response.data['monthly_revenue']), 5500.0)

    def test_transaction_summary_monthly_revenue_uses_latest_income_month(self):
        previous_month_day = (self.today.replace(day=1) - timedelta(days=1)).replace(day=10)

        Transaction.objects.create(
            user=self.sme,
            date=previous_month_day,
            description='Previous month income',
            amount=7200,
            type='income',
            category='Sales',
            status='approved',
        )

        self.client.force_authenticate(user=self.sme)
        response = self.client.get('/api/transactions/summary/')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(float(response.data['monthly_revenue']), 7200.0)

    def test_ca_dashboard_monthly_revenue_uses_latest_income_month(self):
        previous_month_day = (self.today.replace(day=1) - timedelta(days=1)).replace(day=15)

        Transaction.objects.create(
            user=self.sme,
            date=previous_month_day,
            description='Previous month consulting income',
            amount=8300,
            type='income',
            category='Consulting',
            status='pending',
        )

        self.client.force_authenticate(user=self.ca)
        response = self.client.get('/api/transactions/ca/dashboard-summary/')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(float(response.data['monthly_revenue']), 8300.0)
