from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.db import transaction as db_transaction
from apps.users.models import ClientRelationship
from apps.transactions.models import Transaction
from datetime import datetime, timedelta
from decimal import Decimal
import random

User = get_user_model()

class Command(BaseCommand):
    help = 'Create demo SME clients with transactions and link them to a CA user'

    def add_arguments(self, parser):
        parser.add_argument(
            '--ca-username',
            type=str,
            default='ca_demo1',
            help='Username of the CA to link clients to (default: ca_demo1)'
        )
        parser.add_argument(
            '--num-clients',
            type=int,
            default=5,
            help='Number of demo clients to create (default: 5)'
        )

    def handle(self, *args, **options):
        ca_username = options['ca_username']
        num_clients = options['num_clients']

        # Get or create CA user
        try:
            ca_user = User.objects.get(username=ca_username, role='CA')
        except User.DoesNotExist:
            self.stdout.write(
                self.style.ERROR(f'CA user "{ca_username}" not found. Please create it first using create_demo_cas command.')
            )
            return

        # Demo client data with realistic business information
        demo_clients_data = [
            {
                'username': 'client_tech_solutions',
                'email': 'contact@techsolutions.in',
                'first_name': 'Rahul',
                'last_name': 'Sharma',
                'business_name': 'Tech Solutions Pvt Ltd',
                'gst_number': '27AABCT1234M1Z5',
                'phone': '+91 98765 43210',
                'address': '123 Tech Park, Sector 5, Noida',
                'password': 'client123',
                'industry': 'IT Services',
                'business_type': 'Private Limited',
                'monthly_revenue_range': (500000, 800000),  # Base monthly revenue range
            },
            {
                'username': 'client_retail_store',
                'email': 'info@retailstore.in',
                'first_name': 'Priya',
                'last_name': 'Patel',
                'business_name': 'Retail Store & Co',
                'gst_number': '24AABCR5678M2Z6',
                'phone': '+91 87654 32109',
                'address': '456 Main Street, Ahmedabad',
                'password': 'client123',
                'industry': 'Retail',
                'business_type': 'Partnership',
                'monthly_revenue_range': (300000, 500000),
            },
            {
                'username': 'client_consulting_firm',
                'email': 'hello@consultingfirm.in',
                'first_name': 'Amit',
                'last_name': 'Kumar',
                'business_name': 'Kumar Consulting Services',
                'gst_number': '19AABCC9012M3Z7',
                'phone': '+91 76543 21098',
                'address': '789 Business Tower, Gurgaon',
                'password': 'client123',
                'industry': 'Consulting',
                'business_type': 'Sole Proprietorship',
                'monthly_revenue_range': (400000, 600000),
            },
            {
                'username': 'client_manufacturing',
                'email': 'sales@manufacturing.in',
                'first_name': 'Sneha',
                'last_name': 'Singh',
                'business_name': 'Singh Manufacturing Industries',
                'gst_number': '09AABCD3456M4Z8',
                'phone': '+91 65432 10987',
                'address': '321 Industrial Area, Faridabad',
                'password': 'client123',
                'industry': 'Manufacturing',
                'business_type': 'Private Limited',
                'monthly_revenue_range': (800000, 1200000),
            },
            {
                'username': 'client_food_services',
                'email': 'orders@foodservices.in',
                'first_name': 'Vikram',
                'last_name': 'Mehta',
                'business_name': 'Mehta Food Services',
                'gst_number': '07AABCE7890M5Z9',
                'phone': '+91 54321 09876',
                'address': '654 Food Court, Delhi',
                'password': 'client123',
                'industry': 'Food & Beverage',
                'business_type': 'Partnership',
                'monthly_revenue_range': (250000, 400000),
            },
            {
                'username': 'client_digital_agency',
                'email': 'team@digitalagency.in',
                'first_name': 'Anjali',
                'last_name': 'Verma',
                'business_name': 'Digital Agency Pro',
                'gst_number': '11AABCF2345M6Z1',
                'phone': '+91 43210 98765',
                'address': '987 Digital Hub, Bangalore',
                'password': 'client123',
                'industry': 'Digital Marketing',
                'business_type': 'Private Limited',
                'monthly_revenue_range': (350000, 550000),
            },
            {
                'username': 'client_healthcare',
                'email': 'info@healthcare.in',
                'first_name': 'Dr. Rajesh',
                'last_name': 'Gupta',
                'business_name': 'Gupta Healthcare Clinic',
                'gst_number': '29AABCG6789M7Z2',
                'phone': '+91 32109 87654',
                'address': '147 Medical Center, Pune',
                'password': 'client123',
                'industry': 'Healthcare',
                'business_type': 'Sole Proprietorship',
                'monthly_revenue_range': (600000, 900000),
            },
        ]

        # Limit to requested number
        demo_clients_data = demo_clients_data[:num_clients]

        created_clients = []
        created_transactions = 0

        with db_transaction.atomic():
            for client_data in demo_clients_data:
                username = client_data['username']
                password = client_data.pop('password')
                monthly_revenue_range = client_data.pop('monthly_revenue_range')
                industry = client_data.pop('industry')
                business_type = client_data.pop('business_type')

                # Create or get SME user
                try:
                    sme_user = User.objects.get(username=username)
                    created = False
                    # Update existing user
                    for key, value in client_data.items():
                        setattr(sme_user, key, value)
                    sme_user.role = 'SME'
                    sme_user.is_active = True
                    sme_user.is_verified = True
                    # Always reset password to ensure it's correct
                    sme_user.set_password(password)
                    sme_user.save()
                    self.stdout.write(
                        self.style.WARNING(f'Updated client: {username} ({sme_user.business_name})')
                    )
                except User.DoesNotExist:
                    # Create new user using create_user which properly hashes the password
                    sme_user = User.objects.create_user(
                        username=username,
                        password=password,
                        email=client_data.get('email', ''),
                        first_name=client_data.get('first_name', ''),
                        last_name=client_data.get('last_name', ''),
                        business_name=client_data.get('business_name', ''),
                        gst_number=client_data.get('gst_number', ''),
                        phone=client_data.get('phone', ''),
                        address=client_data.get('address', ''),
                        role='SME',
                        is_active=True,
                        is_verified=True,
                    )
                    created = True
                    self.stdout.write(
                        self.style.SUCCESS(f'Created client: {username} ({sme_user.business_name})')
                    )
                
                # Verify password was set correctly
                from django.contrib.auth import authenticate
                test_auth = authenticate(username=username, password=password)
                if test_auth:
                    self.stdout.write(
                        self.style.SUCCESS(f'  ✓ Password verified for {username}')
                    )
                else:
                    self.stdout.write(
                        self.style.ERROR(f'  ✗ Password verification FAILED for {username} - please run: python manage.py reset_demo_passwords --username {username}')
                    )

                # Create or update client relationship
                relationship, rel_created = ClientRelationship.objects.get_or_create(
                    ca=ca_user,
                    sme=sme_user,
                    defaults={'is_active': True, 'access_level': 'FULL'}
                )

                if not rel_created:
                    relationship.is_active = True
                    relationship.save()

                # Generate transactions for the last 6 months
                transactions_created = self.generate_transactions(
                    sme_user, monthly_revenue_range, industry
                )
                created_transactions += transactions_created

                created_clients.append({
                    'username': username,
                    'password': password,
                    'business_name': sme_user.business_name,
                    'email': sme_user.email,
                    'transactions': transactions_created
                })

        # Print summary
        self.stdout.write(
            self.style.SUCCESS(
                f'\n✅ Successfully created/updated {len(created_clients)} demo clients'
            )
        )
        self.stdout.write(
            self.style.SUCCESS(
                f'✅ Created {created_transactions} transactions across all clients'
            )
        )
        self.stdout.write(
            self.style.SUCCESS(
                f'\n📋 Demo Client Credentials:\n'
            )
        )

        for idx, client in enumerate(created_clients, 1):
            self.stdout.write(
                f"{idx}. Username: {client['username']}, Password: {client['password']}\n"
                f"   Business: {client['business_name']}\n"
                f"   Email: {client['email']}\n"
                f"   Transactions: {client['transactions']}\n"
            )

        self.stdout.write(
            self.style.SUCCESS(
                f'\n💡 All clients are linked to CA: {ca_username}'
            )
        )

    def generate_transactions(self, user, monthly_revenue_range, industry):
        """Generate realistic transactions distributed across the last 6 months"""
        now = timezone.now()
        transactions_created = 0

        # Income categories based on industry
        income_categories = {
            'IT Services': ['Software Development', 'IT Consulting', 'Cloud Services', 'Professional Services'],
            'Retail': ['Product Sales', 'Retail Revenue', 'Online Sales', 'Professional Services'],
            'Consulting': ['Consulting Fees', 'Advisory Services', 'Professional Services', 'Training'],
            'Manufacturing': ['Product Sales', 'Manufacturing Revenue', 'Export Sales', 'Professional Services'],
            'Food & Beverage': ['Food Sales', 'Catering Services', 'Restaurant Revenue', 'Professional Services'],
            'Digital Marketing': ['Digital Marketing Services', 'SEO Services', 'Social Media Management', 'Professional Services'],
            'Healthcare': ['Medical Services', 'Consultation Fees', 'Treatment Revenue', 'Professional Services'],
        }

        # Expense categories
        expense_categories = [
            'Office Expenses', 'Travel Expenses', 'Marketing', 'Utilities',
            'Rent', 'Salaries', 'Equipment', 'Software Subscriptions',
            'Professional Services', 'Insurance', 'Maintenance', 'Supplies'
        ]

        # Get category list for this industry
        user_income_categories = income_categories.get(industry, ['Professional Services', 'Sales', 'Services'])

        # Generate transactions for each of the last 6 months
        for month_offset in range(6):
            month_date = now - timedelta(days=30 * month_offset)
            month_start = month_date.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            
            # Calculate base monthly revenue with some variation
            base_revenue = random.randint(*monthly_revenue_range)
            # Add some growth trend (earlier months have slightly less revenue)
            growth_factor = 1.0 - (month_offset * 0.05)  # 5% growth per month
            monthly_revenue = int(base_revenue * growth_factor)

            # Generate 8-15 income transactions per month
            num_income_transactions = random.randint(8, 15)
            income_per_transaction = monthly_revenue / num_income_transactions

            for i in range(num_income_transactions):
                # Distribute transactions throughout the month
                day_in_month = random.randint(1, 28)
                transaction_date = month_start + timedelta(days=day_in_month - 1)

                # Vary the amount slightly
                amount_variation = random.uniform(0.7, 1.3)
                amount = Decimal(str(int(income_per_transaction * amount_variation)))

                # Calculate GST (18% for most services)
                gst_rate = Decimal('18.00')
                gst_amount = amount * gst_rate / Decimal('100')
                cgst_amount = sgst_amount = gst_amount / Decimal('2')
                igst_amount = Decimal('0')  # Assuming same state

                # Net amount before GST
                net_amount = amount - gst_amount

                # Random status (mostly approved, some pending/flagged for review queue)
                status_weights = ['approved'] * 7 + ['pending'] * 2 + ['flagged'] * 1
                status = random.choice(status_weights)

                category = random.choice(user_income_categories)
                vendor_name = f"Client {random.randint(100, 999)}"
                invoice_number = f"INV-{transaction_date.strftime('%Y%m%d')}-{random.randint(1000, 9999)}"

                Transaction.objects.create(
                    user=user,
                    date=transaction_date.date(),
                    description=f"{category} - {vendor_name}",
                    amount=amount,
                    type='income',
                    category=category,
                    status=status,
                    invoice_number=invoice_number,
                    vendor_name=vendor_name,
                    gst_number=f"{random.randint(27, 36)}AABC{random.randint(1000, 9999)}M{random.randint(1, 9)}Z{random.randint(1, 9)}",
                    cgst_amount=cgst_amount,
                    sgst_amount=sgst_amount,
                    igst_amount=igst_amount,
                    tds_amount=Decimal('0'),
                    confidence_score=random.uniform(0.85, 0.98),
                )
                transactions_created += 1

            # Generate 10-20 expense transactions per month
            num_expense_transactions = random.randint(10, 20)
            # Expenses are typically 60-80% of revenue
            monthly_expenses = int(monthly_revenue * random.uniform(0.60, 0.80))
            expense_per_transaction = monthly_expenses / num_expense_transactions

            for i in range(num_expense_transactions):
                day_in_month = random.randint(1, 28)
                transaction_date = month_start + timedelta(days=day_in_month - 1)

                amount_variation = random.uniform(0.5, 2.0)
                amount = Decimal(str(int(expense_per_transaction * amount_variation)))

                # GST for expenses (varies by category)
                gst_rate = Decimal('18.00')  # Most expenses have 18% GST
                if random.random() < 0.2:  # 20% chance of 12% GST
                    gst_rate = Decimal('12.00')
                elif random.random() < 0.05:  # 5% chance of 5% GST
                    gst_rate = Decimal('5.00')

                gst_amount = amount * gst_rate / Decimal('100')
                cgst_amount = sgst_amount = gst_amount / Decimal('2')
                igst_amount = Decimal('0')

                # Status for expenses
                status_weights = ['approved'] * 6 + ['pending'] * 3 + ['flagged'] * 1
                status = random.choice(status_weights)

                category = random.choice(expense_categories)
                vendor_names = [
                    'Office Supplies Co', 'Travel Agency Ltd', 'Marketing Solutions',
                    'Utility Services', 'Property Management', 'HR Services',
                    'Tech Equipment Inc', 'Software Corp', 'Legal Advisors',
                    'Insurance Co', 'Maintenance Services', 'Supply Chain Ltd'
                ]
                vendor_name = random.choice(vendor_names)
                invoice_number = f"EXP-{transaction_date.strftime('%Y%m%d')}-{random.randint(1000, 9999)}"

                Transaction.objects.create(
                    user=user,
                    date=transaction_date.date(),
                    description=f"{category} - {vendor_name}",
                    amount=amount,
                    type='expense',
                    category=category,
                    status=status,
                    invoice_number=invoice_number,
                    vendor_name=vendor_name,
                    gst_number=f"{random.randint(27, 36)}AABC{random.randint(1000, 9999)}M{random.randint(1, 9)}Z{random.randint(1, 9)}",
                    cgst_amount=cgst_amount,
                    sgst_amount=sgst_amount,
                    igst_amount=igst_amount,
                    tds_amount=Decimal('0'),
                    confidence_score=random.uniform(0.80, 0.95),
                )
                transactions_created += 1

        return transactions_created
