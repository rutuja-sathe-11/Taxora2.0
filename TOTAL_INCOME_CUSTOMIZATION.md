# Total Income Calculation - How It Works & Customization Guide

## Current Implementation

### Backend Calculation
**Location:** `backend/apps/transactions/views.py` - `transaction_summary()` function

**Current Logic (Lines 116-119):**
```python
income_transactions = user_transactions.filter(type='income')
income_sum = income_transactions.aggregate(
    total=Sum('amount'))['total'] or 0
```

**What it does:**
- Filters all transactions where `type='income'`
- Sums the `amount` field from all income transactions
- Returns 0 if no income transactions exist
- Supports date filtering via `date_from` and `date_to` query parameters

### Frontend Display
**Location:** `frontend/src/components/SMEDashboard.tsx`

**Current Logic (Lines 69-71):**
```typescript
const totalIncome = summary.total_income != null 
  ? Number(summary.total_income) 
  : monthlyData.reduce((sum, item) => sum + (Number(item.income) || 0), 0)
```

**What it does:**
- Uses `total_income` from the API summary response
- Falls back to calculating from monthly data if summary is null

---

## How to Customize Total Income

### Option 1: Filter by Status (Only Approved Transactions)

Modify the backend to only count approved transactions:

```python
# In backend/apps/transactions/views.py, line 116-119
income_transactions = user_transactions.filter(
    type='income',
    status='approved'  # Only count approved transactions
)
income_sum = income_transactions.aggregate(
    total=Sum('amount'))['total'] or 0
```

### Option 2: Exclude Certain Categories

Exclude specific categories from income calculation:

```python
# In backend/apps/transactions/views.py
EXCLUDED_CATEGORIES = ['Refund', 'Adjustment', 'Reversal']

income_transactions = user_transactions.filter(
    type='income'
).exclude(
    category__in=EXCLUDED_CATEGORIES
)
income_sum = income_transactions.aggregate(
    total=Sum('amount'))['total'] or 0
```

### Option 3: Use Net Amount (After TDS Deduction)

Calculate income after deducting TDS:

```python
# In backend/apps/transactions/views.py
from django.db.models import F, Sum

income_transactions = user_transactions.filter(type='income')
income_sum = income_transactions.aggregate(
    total=Sum(F('amount') - F('tds_amount'))
)['total'] or 0
```

### Option 4: Include Only Specific Categories

Only count income from specific categories:

```python
# In backend/apps/transactions/views.py
INCLUDED_CATEGORIES = ['Sales', 'Services', 'Consulting', 'Products']

income_transactions = user_transactions.filter(
    type='income',
    category__in=INCLUDED_CATEGORIES
)
income_sum = income_transactions.aggregate(
    total=Sum('amount'))['total'] or 0
```

### Option 5: Date Range Filtering (Already Supported)

The current implementation already supports date filtering via query parameters:

```python
# Frontend call example:
const summary = await transactionService.getTransactionSummary({
  date_from: '2024-01-01',
  date_to: '2024-12-31'
})
```

### Option 6: Custom Calculation with Multiple Conditions

Combine multiple filters:

```python
# In backend/apps/transactions/views.py
from django.db.models import Q, Sum, F
from django.utils import timezone
from datetime import timedelta

# Get current year transactions only
current_year_start = timezone.now().replace(month=1, day=1)

income_transactions = user_transactions.filter(
    type='income',
    status='approved',  # Only approved
    date__gte=current_year_start,  # Current year only
).exclude(
    category__in=['Refund', 'Adjustment']  # Exclude certain categories
)

# Calculate net income (after TDS)
income_sum = income_transactions.aggregate(
    total=Sum(F('amount') - F('tds_amount'))
)['total'] or 0
```

### Option 7: Add Custom Query Parameters

Add new query parameters for more control:

```python
# In backend/apps/transactions/views.py, modify transaction_summary function
def transaction_summary(request):
    user_transactions = Transaction.objects.filter(user=request.user)
    
    # Existing date filtering
    date_from = request.query_params.get('date_from')
    date_to = request.query_params.get('date_to')
    # ... existing date filtering code ...
    
    # NEW: Status filtering
    status_filter = request.query_params.get('status')
    if status_filter:
        user_transactions = user_transactions.filter(status=status_filter)
    
    # NEW: Category filtering
    exclude_categories = request.query_params.getlist('exclude_category')
    if exclude_categories:
        user_transactions = user_transactions.exclude(category__in=exclude_categories)
    
    include_categories = request.query_params.getlist('include_category')
    if include_categories:
        user_transactions = user_transactions.filter(category__in=include_categories)
    
    # NEW: Use net amount (after TDS)
    use_net_amount = request.query_params.get('use_net_amount', 'false').lower() == 'true'
    
    # Calculate income
    income_transactions = user_transactions.filter(type='income')
    
    if use_net_amount:
        from django.db.models import F
        income_sum = income_transactions.aggregate(
            total=Sum(F('amount') - F('tds_amount'))
        )['total'] or 0
    else:
        income_sum = income_transactions.aggregate(
            total=Sum('amount')
        )['total'] or 0
    
    # ... rest of the function ...
```

Then use it from frontend:
```typescript
// Frontend example
const summary = await transactionService.getTransactionSummary({
  date_from: '2024-01-01',
  status: 'approved',
  exclude_category: ['Refund', 'Adjustment'],
  use_net_amount: 'true'
})
```

### Option 8: Custom Frontend Calculation

Calculate total income on the frontend with custom logic:

```typescript
// In frontend/src/components/SMEDashboard.tsx
const loadDashboardData = async () => {
  // Get all transactions instead of summary
  const transactions = await transactionService.getTransactions({
    type: 'income',
    status: 'approved'
  })
  
  // Custom calculation
  const totalIncome = transactions
    .filter(t => {
      // Exclude certain categories
      const excludedCategories = ['Refund', 'Adjustment']
      return !excludedCategories.includes(t.category)
    })
    .reduce((sum, t) => {
      // Use net amount (after TDS)
      return sum + (Number(t.amount) - Number(t.tds_amount || 0))
    }, 0)
  
  // Use this custom totalIncome instead of summary.total_income
}
```

---

## Recommended Customization

For most use cases, I recommend **Option 1** (filter by status) combined with **Option 3** (use net amount):

```python
# In backend/apps/transactions/views.py, replace lines 116-119 with:
income_transactions = user_transactions.filter(
    type='income',
    status='approved'  # Only count approved transactions
)

from django.db.models import F
income_sum = income_transactions.aggregate(
    total=Sum(F('amount') - F('tds_amount'))  # Net income after TDS
)['total'] or 0
```

This ensures:
- Only approved transactions are counted
- TDS is deducted from income (more accurate for tax purposes)
- More reliable financial reporting

---

## Testing Your Changes

After modifying the calculation:

1. **Test with existing data:**
   ```python
   # In Django shell
   python manage.py shell
   from apps.transactions.models import Transaction
   from django.db.models import Sum, F
   
   # Test the query
   transactions = Transaction.objects.filter(
       user_id=1,  # Your user ID
       type='income',
       status='approved'
   )
   total = transactions.aggregate(
       total=Sum(F('amount') - F('tds_amount'))
   )['total'] or 0
   print(f"Total Income: {total}")
   ```

2. **Check the API response:**
   - Make a GET request to `/api/transactions/summary/`
   - Verify `total_income` matches your expected calculation

3. **Verify frontend display:**
   - Check the dashboard shows the correct total income
   - Compare with manual calculation if needed

---

## Need Help?

If you need a specific customization, provide:
1. What transactions should be included/excluded
2. Any special calculations needed (TDS, GST, etc.)
3. Any date or status filters required
