from django.urls import path
from . import views

urlpatterns = [
    path('', views.TransactionListCreateView.as_view(), name='transaction_list_create'),
    path('<uuid:pk>/', views.TransactionDetailView.as_view(), name='transaction_detail'),
    path('summary/', views.transaction_summary, name='transaction_summary'),
    path('export/', views.export_transactions, name='export_transactions'),
    path('categories/', views.TransactionCategoryListView.as_view(), name='transaction_categories'),
    path('bank-accounts/', views.BankAccountListCreateView.as_view(), name='bank_accounts'),
    path('<uuid:transaction_id>/review/', views.review_transaction, name='review_transaction'),
    path('ca/client-transactions/', views.ca_client_transactions, name='ca_client_transactions'),
    path('ca/dashboard-summary/', views.ca_dashboard_summary, name='ca_dashboard_summary'),
    path('monthly-trends/', views.monthly_trends, name='monthly_trends'),
    path('expense-breakdown/', views.expense_breakdown, name='expense_breakdown'),
    path('ca/client-growth-trends/', views.ca_client_growth_trends, name='ca_client_growth_trends'),
    path('ca/revenue-breakdown/', views.ca_revenue_breakdown, name='ca_revenue_breakdown'),
    path('ca/compliance-status/', views.ca_compliance_status, name='ca_compliance_status'),
]