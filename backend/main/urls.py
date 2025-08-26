from django.contrib import admin
from django.urls import path, include
from django.conf import settings # MEDIA_URL/ROOT
from django.conf.urls.static import static # static for media files in dev

# Handles http request/response path
urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('auth.urls')),
]

# Serve media files during development (ONLY if DEBUG is True)
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)