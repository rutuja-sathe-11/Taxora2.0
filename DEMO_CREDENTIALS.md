# Demo Credentials and Data Guide

This document contains all the demo credentials and information for testing the Taxora platform.

## 🎯 Quick Start

To populate the database with demo data, run these commands:

```bash
cd backend

# 1. Create demo CA users
python manage.py create_demo_cas

# 2. Create demo clients with transactions
python manage.py create_demo_clients --ca-username ca_demo1 --num-clients 5
```

## 👤 Chartered Accountant (CA) Credentials

### CA Demo 1
- **Username:** `ca_demo1`
- **Password:** `ca123456`
- **Email:** `ca1@taxora.com`
- **Name:** Rajesh Kumar
- **Business:** Kumar & Associates
- **Phone:** +91 98765 43210

### CA Demo 2
- **Username:** `ca_demo2`
- **Password:** `ca123456`
- **Email:** `ca2@taxora.com`
- **Name:** Priya Sharma
- **Business:** Sharma Tax Consultants
- **Phone:** +91 87654 32109

### CA Demo 3
- **Username:** `ca_demo3`
- **Password:** `ca123456`
- **Email:** `ca3@taxora.com`
- **Name:** Amit Patel
- **Business:** Patel Financial Services
- **Phone:** +91 76543 21098

## 🏢 SME Client Credentials

All clients are linked to `ca_demo1` by default. Each client has:
- **6 months of transaction history**
- **Properly distributed income and expenses**
- **Realistic GST calculations**
- **Various transaction statuses (approved, pending, flagged)**

### Client 1: Tech Solutions Pvt Ltd
- **Username:** `client_tech_solutions`
- **Password:** `client123`
- **Email:** `contact@techsolutions.in`
- **Name:** Rahul Sharma
- **Business:** Tech Solutions Pvt Ltd
- **GST Number:** 27AABCT1234M1Z5
- **Industry:** IT Services
- **Monthly Revenue Range:** ₹5,00,000 - ₹8,00,000
- **Address:** 123 Tech Park, Sector 5, Noida
- **Phone:** +91 98765 43210

### Client 2: Retail Store & Co
- **Username:** `client_retail_store`
- **Password:** `client123`
- **Email:** `info@retailstore.in`
- **Name:** Priya Patel
- **Business:** Retail Store & Co
- **GST Number:** 24AABCR5678M2Z6
- **Industry:** Retail
- **Monthly Revenue Range:** ₹3,00,000 - ₹5,00,000
- **Address:** 456 Main Street, Ahmedabad
- **Phone:** +91 87654 32109

### Client 3: Kumar Consulting Services
- **Username:** `client_consulting_firm`
- **Password:** `client123`
- **Email:** `hello@consultingfirm.in`
- **Name:** Amit Kumar
- **Business:** Kumar Consulting Services
- **GST Number:** 19AABCC9012M3Z7
- **Industry:** Consulting
- **Monthly Revenue Range:** ₹4,00,000 - ₹6,00,000
- **Address:** 789 Business Tower, Gurgaon
- **Phone:** +91 76543 21098

### Client 4: Singh Manufacturing Industries
- **Username:** `client_manufacturing`
- **Password:** `client123`
- **Email:** `sales@manufacturing.in`
- **Name:** Sneha Singh
- **Business:** Singh Manufacturing Industries
- **GST Number:** 09AABCD3456M4Z8
- **Industry:** Manufacturing
- **Monthly Revenue Range:** ₹8,00,000 - ₹12,00,000
- **Address:** 321 Industrial Area, Faridabad
- **Phone:** +91 65432 10987

### Client 5: Mehta Food Services
- **Username:** `client_food_services`
- **Password:** `client123`
- **Email:** `orders@foodservices.in`
- **Name:** Vikram Mehta
- **Business:** Mehta Food Services
- **GST Number:** 07AABCE7890M5Z9
- **Industry:** Food & Beverage
- **Monthly Revenue Range:** ₹2,50,000 - ₹4,00,000
- **Address:** 654 Food Court, Delhi
- **Phone:** +91 54321 09876

### Client 6: Digital Agency Pro
- **Username:** `client_digital_agency`
- **Password:** `client123`
- **Email:** `team@digitalagency.in`
- **Name:** Anjali Verma
- **Business:** Digital Agency Pro
- **GST Number:** 11AABCF2345M6Z1
- **Industry:** Digital Marketing
- **Monthly Revenue Range:** ₹3,50,000 - ₹5,50,000
- **Address:** 987 Digital Hub, Bangalore
- **Phone:** +91 43210 98765

### Client 7: Gupta Healthcare Clinic
- **Username:** `client_healthcare`
- **Password:** `client123`
- **Email:** `info@healthcare.in`
- **Name:** Dr. Rajesh Gupta
- **Business:** Gupta Healthcare Clinic
- **GST Number:** 29AABCG6789M7Z2
- **Industry:** Healthcare
- **Monthly Revenue Range:** ₹6,00,000 - ₹9,00,000
- **Address:** 147 Medical Center, Pune
- **Phone:** +91 32109 87654

## 📊 Transaction Data Details

Each demo client includes:

### Income Transactions
- **8-15 income transactions per month** (distributed across 6 months)
- **Categories vary by industry:**
  - IT Services: Software Development, IT Consulting, Cloud Services
  - Retail: Product Sales, Retail Revenue, Online Sales
  - Consulting: Consulting Fees, Advisory Services, Training
  - Manufacturing: Product Sales, Manufacturing Revenue, Export Sales
  - Food & Beverage: Food Sales, Catering Services, Restaurant Revenue
  - Digital Marketing: Digital Marketing Services, SEO Services, Social Media Management
  - Healthcare: Medical Services, Consultation Fees, Treatment Revenue

### Expense Transactions
- **10-20 expense transactions per month** (distributed across 6 months)
- **Common categories:** Office Expenses, Travel Expenses, Marketing, Utilities, Rent, Salaries, Equipment, Software Subscriptions, Professional Services, Insurance, Maintenance, Supplies
- **GST rates:** Mostly 18%, some 12% and 5%

### Transaction Status Distribution
- **Approved:** ~60-70% of transactions
- **Pending:** ~20-30% of transactions (for review queue)
- **Flagged:** ~10% of transactions (for review queue)

### Revenue Distribution
- Transactions are distributed across the last **6 months**
- Each month has a **slight growth trend** (5% increase per month)
- Revenue varies realistically within each client's range
- **GST calculations** are properly applied (CGST + SGST = 18% total for same-state transactions)

## 📈 Dashboard Features

### CA Dashboard
When logged in as a CA user, you'll see:
- **Total Clients:** Number of linked SME clients
- **Pending Reviews:** Transactions requiring attention
- **Compliance Due:** Overdue compliance items
- **Monthly Revenue:** Total revenue from all clients
- **Client Growth & Revenue Chart:** Line chart showing client count and revenue trends
- **Revenue Breakdown:** Pie chart showing revenue by category
- **Compliance Status:** Bar chart showing compliance status by type

### SME Dashboard
When logged in as an SME client, you'll see:
- **Total Income:** Sum of all income transactions
- **Total Expenses:** Sum of all expense transactions
- **Net Profit:** Income minus expenses
- **Income vs Expenses Trend:** Area chart showing monthly trends
- **Expense Breakdown:** Pie chart showing expenses by category
- **AI Insights:** Personalized recommendations

## 🔧 Management Commands

### Create Demo CAs
```bash
python manage.py create_demo_cas
```
Creates 3 demo CA users with credentials listed above.

### Create Demo Clients
```bash
# Create 5 clients (default)
python manage.py create_demo_clients

# Create specific number of clients
python manage.py create_demo_clients --num-clients 7

# Link to specific CA
python manage.py create_demo_clients --ca-username ca_demo2 --num-clients 5
```

### Reset Demo Passwords
```bash
# Reset password for a specific user
python manage.py reset_demo_passwords --username client_tech_solutions

# Reset passwords for all demo users (default password: client123)
python manage.py reset_demo_passwords

# Reset with custom password
python manage.py reset_demo_passwords --username ca_demo1 --password newpassword123
```

### Delete Demo Data
```bash
# Delete demo CAs (and their relationships)
python manage.py delete_demo_cas
```

## 🎨 Graph Distribution

The demo data is designed to create visually appealing and realistic graphs:

1. **Monthly Trends:** Data is evenly distributed across 6 months with a slight upward trend
2. **Category Distribution:** Multiple categories ensure pie charts show varied segments
3. **Revenue Ranges:** Different clients have different revenue ranges for realistic comparison
4. **Status Mix:** Mix of approved/pending/flagged transactions for realistic review queues

## 🔧 Troubleshooting Login Issues

If you're getting "Invalid credentials" error when trying to log in:

### Step 1: Verify Users Exist
```bash
cd backend
python manage.py shell
```
Then in the shell:
```python
from django.contrib.auth import get_user_model
User = get_user_model()
# Check if users exist
print(User.objects.filter(username='client_tech_solutions').exists())
print(User.objects.filter(username='ca_demo1').exists())
```

### Step 2: Reset Passwords
If users exist but login fails, reset their passwords:
```bash
# Reset password for a specific user
python manage.py reset_demo_passwords --username client_tech_solutions

# Reset passwords for all demo users
python manage.py reset_demo_passwords
```

### Step 3: Recreate Demo Data
If users don't exist, create them:
```bash
# Create demo CA users first
python manage.py create_demo_cas

# Then create demo clients
python manage.py create_demo_clients --ca-username ca_demo1 --num-clients 5
```

### Step 4: Verify Authentication
Test authentication directly:
```bash
python manage.py shell
```
```python
from django.contrib.auth import authenticate
user = authenticate(username='client_tech_solutions', password='client123')
print('Authentication successful!' if user else 'Authentication failed!')
```

## 🔐 Security Note

⚠️ **These are demo credentials for development/testing only.**
- Do NOT use these passwords in production
- Change all passwords before deploying to production
- These credentials are publicly visible in the repository

## 📝 Notes

- All transactions include proper GST calculations (CGST + SGST)
- Transaction dates are distributed throughout each month
- Invoice numbers follow realistic patterns
- Vendor names and GST numbers are randomly generated but follow proper formats
- Confidence scores for AI analysis are set between 0.80-0.98
