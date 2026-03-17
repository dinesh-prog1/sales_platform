from django.contrib import admin
from django.urls import path, include
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

urlpatterns = [
    path('admin/', admin.site.urls),

    # JWT Auth
    path('api/v1/auth/login/', TokenObtainPairView.as_view(), name='token_obtain'),
    path('api/v1/auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),

    # Health check
    path('api/v1/health/', lambda r: __import__('django.http', fromlist=['JsonResponse']).JsonResponse({'status': 'ok'})),

    # App routes
    path('api/v1/companies/', include('companies.urls')),
    path('api/v1/demos/', include('demos.urls')),
    path('api/v1/trials/', include('trials.urls')),
    path('api/v1/emails/', include('emails.urls')),
    path('api/v1/analytics/', include('analytics.urls')),
    path('api/v1/interest/', include('interest.urls')),
]
