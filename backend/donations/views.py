"""
Views for Donation management and Razorpay payment integration.
"""
import json
import logging

from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.exceptions import PermissionDenied, ValidationError as DRFValidationError
from django_filters.rest_framework import DjangoFilterBackend
from django.core.exceptions import ValidationError as DjangoValidationError

from donations.models import Donation, DonationStatus
from donations.serializers import (
    DonationSerializer,
    DonationInitiateSerializer,
    DonationVerifySerializer,
)
from donations.services import DonationService

logger = logging.getLogger(__name__)


class DonationViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Donation CRUD, order initiation, payment verification, and webhooks.

    - Donors can view their own donations and initiate new ones.
    - Charity owners can view donations received by their campaigns.
    - Admins can view all donations.
    """
    queryset = Donation.objects.select_related('donor', 'campaign', 'campaign__organization').all()
    serializer_class = DonationSerializer
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter, filters.SearchFilter]
    filterset_fields = ['status', 'currency', 'is_anonymous', 'campaign']
    search_fields = ['campaign__title', 'message']
    ordering_fields = ['created_at', 'amount']
    ordering = ['-created_at']

    def get_permissions(self):
        if self.action == 'webhook':
            return [AllowAny()]
        return [IsAuthenticated()]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user

        if not user.is_authenticated:
            return qs.none()

        if user.is_admin_user():
            return qs

        if user.is_charity() and hasattr(user, 'charity_organization'):
            # Charity owners see donations to their campaigns
            return qs.filter(campaign__organization=user.charity_organization)

        # Donors see their own donations
        return qs.filter(donor=user)

    def create(self, request, *args, **kwargs):
        """
        Initiate a donation and create a Razorpay order.
        """
        user = request.user
        if not user.is_authenticated:
            raise PermissionDenied('Authentication required to make a donation.')

        serializer = DonationInitiateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        try:
            donation = DonationService.initiate_donation(
                donor=user,
                campaign=data['campaign'],
                amount=data['amount'],
                currency=data.get('currency', 'INR'),
                is_anonymous=data.get('is_anonymous', False),
                message=data.get('message', ''),
                idempotency_key=data.get('idempotency_key'),
            )
        except DjangoValidationError as e:
            raise DRFValidationError(str(e))

        response_serializer = DonationSerializer(donation, context={'request': request})
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def verify_payment(self, request, pk=None):
        """
        Verify Razorpay payment signature and complete donation.
        """
        donation = self.get_object()
        user = request.user

        if not user.is_admin_user() and donation.donor != user:
            raise PermissionDenied('You do not have permission to verify this donation.')

        serializer = DonationVerifySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        try:
            completed_donation = DonationService.complete_donation(
                donation=donation,
                razorpay_payment_id=data['razorpay_payment_id'],
                razorpay_signature=data['razorpay_signature'],
            )
        except DjangoValidationError as e:
            raise DRFValidationError(str(e))

        response_serializer = DonationSerializer(completed_donation, context={'request': request})
        return Response(response_serializer.data, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'], permission_classes=[AllowAny])
    def webhook(self, request):
        """
        Razorpay webhook endpoint for asynchronous payment confirmation.
        """
        signature = request.META.get('HTTP_X_RAZORPAY_SIGNATURE', '')
        raw_body = request.body

        try:
            payload = json.loads(raw_body.decode('utf-8'))
        except (ValueError, UnicodeDecodeError):
            return Response({'error': 'Invalid payload.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            success = DonationService.handle_webhook_event(payload, signature, raw_body)
            if success:
                return Response({'status': 'success'}, status=status.HTTP_200_OK)
            return Response({'status': 'ignored'}, status=status.HTTP_200_OK)
        except DjangoValidationError as e:
            # Invalid webhook signature (@signature forged or misconfigured secret).
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception:
            # Log the full traceback internally but never echo exception internals
            # back to the caller (a forged webhook must not probe internals).
            logger.exception('Unhandled error while processing Razorpay webhook.')
            return Response({'error': 'Internal server error.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
