"""
URL configuration for volunteers app.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import VolunteerOpportunityViewSet, VolunteerApplicationViewSet

app_name = 'volunteers'

router = DefaultRouter()
router.register(r'opportunities', VolunteerOpportunityViewSet, basename='volunteer-opportunity')
router.register(r'applications', VolunteerApplicationViewSet, basename='volunteer-application')

urlpatterns = [
    path('', include(router.urls)),
]
