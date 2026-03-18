from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

app_name = 'chat'

router = DefaultRouter()
router.register(r'conversations', views.ConversationViewSet, basename='conversation')

# Nested router for messages within conversations
from rest_framework_nested import routers as nested_routers

conversations_router = nested_routers.NestedSimpleRouter(
    router, 'conversations', lookup='conversation'
)
conversations_router.register(r'messages', views.MessageViewSet, basename='conversation-messages')

urlpatterns = [
    # Router URLs
    path('', include(router.urls)),
    path('', include(conversations_router.urls)),
    
    # Additional convenience endpoints
    path('conversations/', views.conversation_list, name='conversation-list'),
    path('conversations/<uuid:ca_id>/request/', views.send_connection_request, name='send-connection-request'),
]
