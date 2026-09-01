"""
URL configuration for campaigns API endpoints.

All endpoints are versioned under /api/v1/campaigns/
"""
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from campaigns.views import CampaignViewSet, CampaignUpdateViewSet

router = DefaultRouter()
router.register('', CampaignViewSet, basename='campaign')
router.register('updates', CampaignUpdateViewSet, basename='campaign-updates')

urlpatterns = [
    path('updates/', CampaignUpdateViewSet.as_view({'get': 'list', 'post': 'create'})),
    path('updates/<int:pk>/', CampaignUpdateViewSet.as_view({'get': 'retrieve', 'put': 'update', 'patch': 'partial_update', 'delete': 'destroy'})),
    path('<int:campaign_pk>/updates/', CampaignUpdateViewSet.as_view({'get': 'list', 'post': 'create'})),
    path('<int:campaign_pk>/updates/<int:pk>/', CampaignUpdateViewSet.as_view({'get': 'retrieve', 'put': 'update', 'patch': 'partial_update', 'delete': 'destroy'})),
    path('', include(router.urls)),
]
