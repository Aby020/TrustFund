"""
URL configuration for Charity Organization verification workflow.
"""
from django.urls import path

from charities.views import (
    CharityOrganizationCreateView,
    CharityOrganizationDetailView,
    CharityOrganizationListView,
    MyOrganizationView,
    VerificationApproveView,
    VerificationHistoryView,
    VerificationRejectView,
    VerificationResubmitView,
    VerificationSubmitView,
)

urlpatterns = [
    # Organization CRUD
    path('', CharityOrganizationListView.as_view(), name='charity-list'),
    path('me/', MyOrganizationView.as_view(), name='charity-me'),
    path('create/', CharityOrganizationCreateView.as_view(), name='charity-create'),
    path('<int:pk>/', CharityOrganizationDetailView.as_view(), name='charity-detail'),

    # Verification workflow
    path('<int:pk>/submit/', VerificationSubmitView.as_view(), name='charity-submit'),
    path('<int:pk>/approve/', VerificationApproveView.as_view(), name='charity-approve'),
    path('<int:pk>/reject/', VerificationRejectView.as_view(), name='charity-reject'),
    path('<int:pk>/resubmit/', VerificationResubmitView.as_view(), name='charity-resubmit'),
    path('<int:pk>/history/', VerificationHistoryView.as_view(), name='charity-history'),
]