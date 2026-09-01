"""
Views for Campaign management.
"""
from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.exceptions import PermissionDenied, NotFound, ValidationError as DRFValidationError
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q
from django.core.exceptions import ValidationError as DjangoValidationError

from campaigns.models import Campaign, CampaignStatus
from campaigns.serializers import (
    CampaignSerializer,
    CampaignCreateSerializer,
    CampaignUpdateSerializer,
)
from charities.models import CharityOrganization, VerificationStatus


class CampaignViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Campaign CRUD and discovery.

    - List / Retrieve: Public / authenticated discovery with filtering, search, ordering.
    - Create: Only verified charity owners.
    - Update / Partial Update: Only the owner charity of their own campaign.
    - Cancel / Delete: Only owner charity.
    """
    queryset = Campaign.objects.select_related('organization', 'organization__owner').all()
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['category', 'status', 'location', 'organization']
    search_fields = ['title', 'description', 'location', 'organization__name']
    ordering_fields = ['created_at', 'goal_amount', 'raised_amount', 'start_date', 'end_date']
    ordering = ['-created_at']

    def get_serializer_class(self):
        if self.action == 'create':
            return CampaignCreateSerializer
        if self.action in ['update', 'partial_update']:
            return CampaignUpdateSerializer
        return CampaignSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [AllowAny()]
        return [IsAuthenticated()]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user

        # If user is admin, they see all campaigns
        if user.is_authenticated and user.is_admin_user():
            return qs

        # If user is a charity owner, they can see their own campaigns regardless of status,
        # plus all ACTIVE campaigns. Other users see only ACTIVE campaigns.
        if user.is_authenticated and user.is_charity() and hasattr(user, 'charity_organization'):
            return qs.filter(
                Q(status=CampaignStatus.ACTIVE) |
                Q(organization=user.charity_organization)
            )

        # Default for donors, volunteers, unauthenticated: only ACTIVE campaigns
        return qs.filter(status=CampaignStatus.ACTIVE)

    def perform_create(self, serializer):
        user = self.request.user
        if not user.is_charity():
            raise PermissionDenied('Only users with CHARITY role can create campaigns.')

        try:
            org = user.charity_organization
        except CharityOrganization.DoesNotExist:
            raise PermissionDenied('You must create a charity organization before creating campaigns.')

        if not org.is_verified:
            raise PermissionDenied('Only verified charity organizations can create campaigns.')

        serializer.save(organization=org)

    def perform_update(self, serializer):
        campaign = self.get_object()
        user = self.request.user

        if not user.is_admin_user():
            if not user.is_charity() or campaign.organization.owner != user:
                raise PermissionDenied('You do not have permission to modify this campaign.')

        # Ensure raised_amount cannot be changed through API
        if 'raised_amount' in self.request.data:
            raise DRFValidationError({'raised_amount': 'Raised amount cannot be modified through campaign endpoints.'})

        serializer.save()

    def perform_destroy(self, instance):
        user = self.request.user
        if not user.is_admin_user():
            if not user.is_charity() or instance.organization.owner != user:
                raise PermissionDenied('You do not have permission to delete this campaign.')
        instance.delete()

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def cancel(self, request, pk=None):
        """Cancel a campaign."""
        campaign = self.get_object()
        user = request.user

        if not user.is_admin_user():
            if not user.is_charity() or campaign.organization.owner != user:
                raise PermissionDenied('You do not have permission to cancel this campaign.')

        try:
            campaign.cancel(user)
        except DjangoValidationError as e:
            raise DRFValidationError(str(e))

        serializer = CampaignSerializer(campaign)
        return Response(serializer.data, status=status.HTTP_200_OK)
