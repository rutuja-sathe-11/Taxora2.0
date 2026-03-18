from django.urls import path
from . import views

urlpatterns = [
    path('', views.DocumentListCreateView.as_view(), name='document_list_create'),
    path('<uuid:pk>/', views.DocumentDetailView.as_view(), name='document_detail'),
    path('<uuid:document_id>/share/', views.share_document, name='share_document'),
    path('shared/', views.shared_documents, name='shared_documents'),
    path('analytics/', views.document_analytics, name='document_analytics'),
]