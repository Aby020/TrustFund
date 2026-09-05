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

from campaigns.models import Campaign, CampaignStatus, CampaignUpdate
from campaigns.serializers import (
    CampaignSerializer,
    CampaignCreateSerializer,
    CampaignUpdateSerializer,
    CampaignUpdateReadSerializer,
    CampaignUpdateWriteSerializer,
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


class CampaignUpdateViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Campaign Updates.
    - List/Retrieve: All users (for campaigns they can see).
    - Create/Update/Delete: Only the charity owner of the campaign.
    """
    queryset = CampaignUpdate.objects.select_related('campaign', 'created_by').all()
    serializer_class = CampaignUpdateReadSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['campaign']

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return CampaignUpdateWriteSerializer
        return CampaignUpdateReadSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [AllowAny()]
        return [IsAuthenticated()]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user

        # Admin can see all updates
        if user.is_authenticated and user.is_admin_user():
            return qs

        # If campaign_pk is in kwargs (nested URL), filter by it
        campaign_pk = self.kwargs.get('campaign_pk')
        if campaign_pk:
            qs = qs.filter(campaign_id=campaign_pk)

        # Others can see updates for campaigns they are allowed to view (ACTIVE campaigns, or their own)
        if user.is_authenticated and user.is_charity() and hasattr(user, 'charity_organization'):
            return qs.filter(
                Q(campaign__status=CampaignStatus.ACTIVE) |
                Q(campaign__organization=user.charity_organization)
            )

        return qs.filter(campaign__status=CampaignStatus.ACTIVE)

    def perform_create(self, serializer):
        campaign_id = self.request.data.get('campaign') or self.kwargs.get('campaign_pk')
        if not campaign_id:
            raise DRFValidationError({'campaign': 'Campaign ID is required.'})

        try:
            campaign = Campaign.objects.get(pk=campaign_id)
        except Campaign.DoesNotExist:
            raise NotFound('Campaign not found.')

        user = self.request.user
        if not user.is_charity() or campaign.organization.owner != user:
             raise PermissionDenied('Only the charity owner can create campaign updates.')

        if not campaign.organization.is_verified:
            raise PermissionDenied('Only verified charities can manage campaign updates.')

        serializer.save(campaign=campaign, created_by=user)

    def perform_update(self, serializer):
        update = self.get_object()
        campaign = update.campaign
        user = self.request.user

        if not user.is_admin_user():
            if not user.is_charity() or campaign.organization.owner != user:
                raise PermissionDenied('You do not have permission to modify this campaign update.')

        serializer.save()

    def perform_destroy(self, instance):
        campaign = instance.campaign
        user = self.request.user

        if not user.is_admin_user():
            if not user.is_charity() or campaign.organization.owner != user:
                raise PermissionDenied('You do not have permission to delete this campaign update.')

        instance.delete()

