from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('apps.users.urls')),
    path('api/documents/', include('apps.documents.urls')),
    path('api/transactions/', include('apps.transactions.urls')),
    path('api/ai/', include('apps.ai_services.urls')),
    path('api/compliance/', include('apps.compliance.urls')),
    path('api/chat/', include('chat.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)