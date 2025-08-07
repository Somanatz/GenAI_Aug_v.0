
from django.contrib import admin
from django.urls import path, include
from accounts.views import LoginView # Import custom login view
from django.conf import settings # Required for media files in DEBUG mode
from django.conf.urls.static import static # Required for media files in DEBUG mode

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('accounts.urls')),
    path('api/', include('content.urls')),
    path('api/', include('notifications.urls')),
    # The login view is part of accounts.urls now, this line is redundant
    path('api/token-auth/', LoginView.as_view(), name='api_token_auth'),
    path('api/', include('forum.urls')), # Use the base 'api/' path
    path('api/token-auth/', LoginView.as_view(), name='api_token_auth'), # Overwrite with custom login view
    
]

# Serve media files during development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
