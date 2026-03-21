from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from apps.users.models import ClientRelationship
from apps.transactions.models import Transaction
from apps.compliance.models import Client as ComplianceClient


User = get_user_model()


class ComplianceClientFlowTests(TestCase):
    def setUp(self):
        self.ca = User.objects.create_user(
            username='ca_compliance',
            email='ca_compliance@test.com',
            password='password',
            role='CA',
            is_active=True,
        )
        self.sme = User.objects.create_user(
            username='sme_compliance',
            email='sme_compliance@test.com',
            password='password',
            role='SME',
            is_active=True,
        )
        ClientRelationship.objects.create(ca=self.ca, sme=self.sme, is_active=True)

        self.client = APIClient()
        self.client.force_authenticate(user=self.ca)

    def test_generate_client_gstr3b_uses_main_transactions_fallback(self):
        Transaction.objects.create(
            user=self.sme,
            date='2026-03-10',
            description='Invoice income',
            amount=Decimal('10000.00'),
            type='income',
            category='Sales',
            status='approved',
            cgst_amount=Decimal('900.00'),
            sgst_amount=Decimal('900.00'),
            igst_amount=Decimal('0.00'),
        )

        response = self.client.get(f'/api/compliance/gst/gstr3b/{self.sme.id}/?period=2026-03')

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data['transaction_count'], 1)
        self.assertEqual(float(data['outward_supplies']['taxable_value']), 10000.0)
        self.assertEqual(float(data['tax_liability']['output_tax']), 1800.0)

    def test_send_message_auto_creates_managed_client(self):
        self.assertFalse(
            ComplianceClient.objects.filter(user=self.ca, email=self.sme.email).exists()
        )

        response = self.client.post(
            '/api/compliance/messages/send/',
            {
                'client_id': str(self.sme.id),
                'message_text': 'Test share',
            },
            format='json',
        )

        self.assertEqual(response.status_code, 201)
        self.assertTrue(
            ComplianceClient.objects.filter(user=self.ca, email=self.sme.email).exists()
        )
