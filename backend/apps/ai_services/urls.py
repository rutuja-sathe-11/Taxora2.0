from django.urls import path
from . import views

urlpatterns = [
    path('chat/sessions/', views.ChatSessionListView.as_view(), name='chat_sessions'),
    path('chat/sessions/<uuid:pk>/', views.ChatSessionDetailView.as_view(), name='chat_session_detail'),
    path('chat/', views.chat_with_ai, name='chat_with_ai'),
    path('insights/', views.AIInsightListView.as_view(), name='ai_insights'),
    path('insights/<uuid:insight_id>/read/', views.mark_insight_read, name='mark_insight_read'),
    path('insights/<uuid:insight_id>/dismiss/', views.dismiss_insight, name='dismiss_insight'),
    path('analytics/', views.ai_analytics, name='ai_analytics'),
    path('analyze-documents/', views.analyze_documents, name='analyze_documents'),
]