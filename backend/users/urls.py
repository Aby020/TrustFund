"""
URL configuration for authentication API endpoints.

All endpoints are versioned under /api/v1/auth/
"""

from django.urls import path

from users.views import (
    RegisterView,
    LoginView,
    RefreshView,
    LogoutView,
    MeView,
)

urlpatterns = [
    path('register/', RegisterView.as_view(), name='auth-register'),
    path('login/', LoginView.as_view(), name='auth-login'),
    path('refresh/', RefreshView.as_view(), name='auth-refresh'),
    path('logout/', LogoutView.as_view(), name='auth-logout'),
    path('me/', MeView.as_view(), name='auth-me'),
]