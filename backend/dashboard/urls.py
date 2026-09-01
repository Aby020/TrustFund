"""
URL configuration for dashboard and analytics API endpoints.
"""
from django.urls import path
from dashboard.views import (
    DonorDashboardView,
    CharityDashboardView,
    AdminDashboardView,
    AnalyticsView,
)

urlpatterns = [
    path('donor/', DonorDashboardView.as_view(), name='donor-dashboard'),
    path('charity/', CharityDashboardView.as_view(), name='charity-dashboard'),
    path('admin/', AdminDashboardView.as_view(), name='admin-dashboard'),
    path('analytics/', AnalyticsView.as_view(), name='analytics'),
]
