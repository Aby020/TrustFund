"""
URL configuration for notifications API.
"""
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from notifications.views import NotificationViewSet

router = DefaultRouter()
router.register('', NotificationViewSet, basename='notification')

urlpatterns = [
    path('', include(router.urls)),
]
