from django.test import TestCase
from django.contrib.auth import get_user_model
from apps.transactions.models import Transaction
from apps.compliance.views import generate_gstr3b_data, calculate_tax, calculate_gst
from rest_framework.test import APIRequestFactory
from rest_framework.request import Request
from decimal import Decimal

User = get_user_model()

class ComplianceTestCase(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123',
            role='SME'
        )
        self.factory = APIRequestFactory()

    def test_gstr3b_generation(self):
        """Test GSTR-3B data generation from transactions"""
        # Create sample transactions
        Transaction.objects.create(
            user=self.user,
            date='2024-10-05',
            description='Sales',
            amount=Decimal('50000.00'),
            type='income',
            category='Revenue',
            status='approved',
            cgst_amount=Decimal('4500.00'),
            sgst_amount=Decimal('4500.00')
        )

        Transaction.objects.create(
            user=self.user,
            date='2024-10-10',
            description='Purchase',
            amount=Decimal('30000.00'),
            type='expense',
            category='Materials',
            status='approved',
            cgst_amount=Decimal('2700.00'),
            sgst_amount=Decimal('2700.00')
        )

        # Create request
        request = self.factory.post('/api/compliance/generate-gstr3b/', {'period': '10-2024'})
        request.user = self.user
        drf_request = Request(request)

        # Generate GSTR-3B
        response = generate_gstr3b_data(drf_request)

        # Assertions
        self.assertEqual(response.status_code, 200)
        data = response.data

        # Check structure
        self.assertIn('period', data)
        self.assertIn('outward_supplies', data)
        self.assertIn('inward_supplies', data)
        self.assertIn('tax_liability', data)

        # Check values
        self.assertEqual(data['period'], '10-2024')
        self.assertGreater(data['outward_supplies']['taxable_value'], 0)
        self.assertGreater(data['tax_liability']['output_tax'], 0)

        # Net liability should be calculated
        self.assertIn('net_tax_payable', data['tax_liability'])

    def test_gstr3b_invalid_period(self):
        """Test GSTR-3B with invalid period format"""
        request = self.factory.post('/api/compliance/generate-gstr3b/', {'period': 'invalid'})
        request.user = self.user
        drf_request = Request(request)

        response = generate_gstr3b_data(drf_request)

        # Should return error
        self.assertEqual(response.status_code, 400)

    def test_tax_calculation(self):
        """Test income tax calculation"""
        request_data = {
            'income_amount': 1200000,
            'deductions_80c': 150000,
            'deductions_80d': 25000,
            'other_deductions': 0
        }

        request = self.factory.post('/api/compliance/calculate-tax/', request_data, format='json')
        request.user = self.user
        drf_request = Request(request)

        response = calculate_tax(drf_request)

        # Assertions
        self.assertEqual(response.status_code, 200)
        data = response.data

        # Check required fields
        self.assertIn('gross_income', data)
        self.assertIn('total_deductions', data)
        self.assertIn('taxable_income', data)
        self.assertIn('income_tax', data)
        self.assertIn('health_cess', data)
        self.assertIn('total_tax_liability', data)
        self.assertIn('effective_tax_rate', data)

        # Values should be numeric (not NaN)
        self.assertIsInstance(data['gross_income'], (int, float))
        self.assertIsInstance(data['taxable_income'], (int, float))
        self.assertIsInstance(data['income_tax'], (int, float))
        self.assertIsInstance(data['total_tax_liability'], (int, float))

        # Tax should be positive
        self.assertGreaterEqual(data['income_tax'], 0)

        # Taxable income should be gross minus deductions
        expected_taxable = 1200000 - 175000
        self.assertEqual(data['taxable_income'], expected_taxable)

    def test_gst_calculation_intrastate(self):
        """Test GST calculation for intrastate transaction"""
        request_data = {
            'taxable_amount': 10000,
            'gst_rate': 18,
            'transaction_type': 'intrastate'
        }

        request = self.factory.post('/api/compliance/calculate-gst/', request_data, format='json')
        request.user = self.user
        drf_request = Request(request)

        response = calculate_gst(drf_request)

        # Assertions
        self.assertEqual(response.status_code, 200)
        data = response.data

        # Check fields
        self.assertIn('taxable_amount', data)
        self.assertIn('cgst_amount', data)
        self.assertIn('sgst_amount', data)
        self.assertIn('igst_amount', data)
        self.assertIn('total_gst', data)
        self.assertIn('total_amount', data)

        # For intrastate, CGST and SGST should be half each
        self.assertEqual(data['cgst_amount'], 900.0)  # 10000 * 0.18 / 2
        self.assertEqual(data['sgst_amount'], 900.0)
        self.assertEqual(data['igst_amount'], 0.0)
        self.assertEqual(data['total_gst'], 1800.0)
        self.assertEqual(data['total_amount'], 11800.0)

    def test_gst_calculation_interstate(self):
        """Test GST calculation for interstate transaction"""
        request_data = {
            'taxable_amount': 10000,
            'gst_rate': 18,
            'transaction_type': 'interstate'
        }

        request = self.factory.post('/api/compliance/calculate-gst/', request_data, format='json')
        request.user = self.user
        drf_request = Request(request)

        response = calculate_gst(drf_request)

        data = response.data

        # For interstate, only IGST
        self.assertEqual(data['cgst_amount'], 0.0)
        self.assertEqual(data['sgst_amount'], 0.0)
        self.assertEqual(data['igst_amount'], 1800.0)  # 10000 * 0.18
        self.assertEqual(data['total_gst'], 1800.0)

    def test_tax_calculation_no_deductions(self):
        """Test tax calculation with no deductions"""
        request_data = {
            'income_amount': 500000,
            'deductions_80c': 0,
            'deductions_80d': 0,
            'other_deductions': 0
        }

        request = self.factory.post('/api/compliance/calculate-tax/', request_data, format='json')
        request.user = self.user
        drf_request = Request(request)

        response = calculate_tax(drf_request)

        data = response.data

        # Taxable income should equal gross income
        self.assertEqual(data['taxable_income'], 500000.0)
        self.assertEqual(data['total_deductions'], 0.0)

    def test_gstr3b_csv_structure(self):
        """Test GSTR-3B returns proper structure for CSV export"""
        # Create transaction
        Transaction.objects.create(
            user=self.user,
            date='2024-10-15',
            description='Test Sale',
            amount=Decimal('100000.00'),
            type='income',
            category='Revenue',
            status='approved',
            cgst_amount=Decimal('9000.00'),
            sgst_amount=Decimal('9000.00')
        )

        request = self.factory.post('/api/compliance/generate-gstr3b/', {'period': '10-2024'})
        request.user = self.user
        drf_request = Request(request)

        response = generate_gstr3b_data(drf_request)
        data = response.data

        # Check all fields are present for CSV export
        required_fields = ['period', 'outward_supplies', 'inward_supplies', 'tax_liability']
        for field in required_fields:
            self.assertIn(field, data)

        # Check nested structures
        self.assertIn('taxable_value', data['outward_supplies'])
        self.assertIn('cgst', data['outward_supplies'])
        self.assertIn('sgst', data['outward_supplies'])
        self.assertIn('net_tax_payable', data['tax_liability'])
