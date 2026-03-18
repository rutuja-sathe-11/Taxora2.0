from django.urls import path
from . import views

urlpatterns = [
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