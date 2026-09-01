"""
URL configuration for campaigns API endpoints.

All endpoints are versioned under /api/v1/campaigns/
"""
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from campaigns.views import CampaignViewSet

router = DefaultRouter()
router.register('', CampaignViewSet, basename='campaign')

urlpatterns = [
    path('', include(router.urls)),
]