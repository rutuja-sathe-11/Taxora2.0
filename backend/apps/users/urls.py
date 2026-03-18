from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from . import views

urlpatterns = [
    path('register/', views.register, name='register'),
    path('login/', views.login, name='login'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('profile/', views.UserProfileView.as_view(), name='profile'),
    path('audit-logs/', views.AuditLogListView.as_view(), name='audit_logs'),
    path('clients/', views.ClientListView.as_view(), name='clients'),
    path('clients/create/', views.create_client, name='create_client'),
    path('clients/<uuid:client_id>/', views.update_client, name='update_client'),
    path('clients/<uuid:client_id>/remove/', views.remove_client, name='remove_client'),
    path('cas/', views.list_cas, name='list_cas'),
    path('connect-ca/', views.connect_with_ca, name='connect_ca'),
    path('password-reset/', views.password_reset, name='password_reset'),
    path('password-reset/confirm/', views.password_reset_confirm, name='password_reset_confirm'),
]