from django.urls import path
from . import views

urlpatterns = [
    path('reports/pnl/<str:client_id>/', views.generate_pnl_report, name='generate_pnl_report'),
    path('reports/<str:client_id>/', views.reports_by_client, name='reports_by_client'),
    path('messages/send/', views.send_message, name='send_message'),
    path('messages/<str:client_id>/', views.get_client_messages, name='get_client_messages'),
    path('notices/', views.NoticeListCreateView.as_view(), name='notice_list_create'),
    path('notices/<int:pk>/', views.NoticeDetailView.as_view(), name='notice_detail'),

    path('gst/transactions/', views.GSTTransactionListCreateView.as_view(), name='gst_transaction_list_create'),
    path('gst/transactions/<str:client_id>/', views.ClientTransactionListView.as_view(), name='gst_client_transactions'),
    path('gst/calculate/<str:client_id>/', views.calculate_client_gst, name='gst_calculate_client'),
    path('gst/gstr3b/<str:client_id>/', views.generate_client_gstr3b, name='gst_generate_gstr3b_client'),
    path('itr/calculate/', views.itr_calculate_and_file, name='itr_calculate_and_file'),
    path('itr/records/<str:client_id>/', views.itr_records_by_client, name='itr_records_by_client'),
    path('itr/summary/<int:record_id>/', views.itr_client_summary, name='itr_client_summary'),
    path('tds/calculate/', views.tds_calculate_and_save, name='tds_calculate_and_save'),
    path('tds/<str:client_id>/', views.tds_records_by_client, name='tds_records_by_client'),

    path('calendar/', views.ComplianceCalendarView.as_view(), name='compliance_calendar'),
    path('calendar/<int:item_id>/complete/', views.mark_compliance_completed, name='mark_compliance_completed'),
    path('gst-returns/', views.GSTReturnListCreateView.as_view(), name='gst_returns'),
    path('itr-filings/', views.ITRFilingListCreateView.as_view(), name='itr_filings'),
    path('score/', views.compliance_score, name='compliance_score'),
    path('calculate-tax/', views.calculate_tax, name='calculate_tax'),
    path('calculate-gst/', views.calculate_gst, name='calculate_gst'),
    path('dashboard/', views.compliance_dashboard, name='compliance_dashboard'),
    path('generate-gstr3b/', views.generate_gstr3b_data, name='generate_gstr3b'),
]