from datetime import timedelta

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from apps.transactions.models import Transaction
from apps.users.models import ClientRelationship


User = get_user_model()


class ClientListMonthlyRevenueTests(TestCase):
    def setUp(self):
        self.ca = User.objects.create_user(
            username='ca_client_list',
            email='ca_client_list@test.com',
            password='password',
            role='CA',
            is_active=True,
        )
        self.sme = User.objects.create_user(
            username='sme_client_list',
            email='sme_client_list@test.com',
            password='password',
            role='SME',
            is_active=True,
        )
        ClientRelationship.objects.create(ca=self.ca, sme=self.sme, is_active=True)
        self.client = APIClient()

    def test_client_list_monthly_revenue_uses_latest_income_month(self):
        today = timezone.now().date()
        previous_month_day = (today.replace(day=1) - timedelta(days=1)).replace(day=12)

        Transaction.objects.create(
            user=self.sme,
            date=previous_month_day,
            description='Old month income',
            amount=9100,
            type='income',
            category='Services',
            status='approved',
        )

        self.client.force_authenticate(user=self.ca)
        response = self.client.get('/api/auth/clients/')

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(len(data['results']) > 0)
        self.assertEqual(float(data['results'][0]['monthly_revenue']), 9100.0)
