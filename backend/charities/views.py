"""
Views for Charity Organization verification workflow.
"""
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import BasePermission, IsAuthenticated
from rest_framework.exceptions import PermissionDenied, NotFound, ValidationError as DRFValidationError
from django.core.exceptions import ValidationError as DjangoValidationError

from users.models import Role
from charities.models import CharityOrganization, VerificationStatus, VerificationAction, VerificationLog
from charities.serializers import (
    CharityOrganizationSerializer,
    CharityOrganizationCreateSerializer,
    VerificationSubmitSerializer,
    VerificationApproveSerializer,
    VerificationRejectSerializer,
    VerificationResubmitSerializer,
    VerificationHistorySerializer,
)


class IsAdminUser(BasePermission):
    """Permission check for admin users."""

    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.is_admin_user()


class IsCharityOwner(BasePermission):
    """Permission check for charity organization owner."""

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.is_charity()
        )


class CharityOrganizationCreateView(APIView):
    """
    POST /api/v1/charities/

    Create a new charity organization (charity owners only).
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        if not request.user.is_charity():
            raise PermissionDenied('Only users with CHARITY role can create charity organizations.')

        # Check if user already has an organization
        if hasattr(request.user, 'charity_organization'):
            raise DRFValidationError('A charity user can only own one organization.')

        serializer = CharityOrganizationCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Set the owner to the current user
        org = serializer.save(owner=request.user)

        # Log the creation (initial PENDING state)
        VerificationLog.objects.create(
            organization=org,
            action=VerificationAction.SUBMIT,
            performed_by=request.user,
            from_status=VerificationStatus.PENDING,
            to_status=VerificationStatus.PENDING,
            reason='Organization created',
        )

        response_serializer = CharityOrganizationSerializer(org)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)


class CharityOrganizationDetailView(APIView):
    """
    GET /api/v1/charities/{id}/
    PATCH /api/v1/charities/{id}/

    Get or update a charity organization.
    Owner can update basic info. Verification fields are read-only.
    """

    permission_classes = [IsAuthenticated]

    def get_organization(self, pk, user):
        try:
            return CharityOrganization.objects.select_related('owner', 'reviewed_by').get(pk=pk)
        except CharityOrganization.DoesNotExist:
            raise NotFound('Charity organization not found.')

    def get(self, request, pk):
        org = self.get_organization(pk, request.user)

        # Allow access to owner, admins, and verified orgs (public info)
        if not (request.user.is_admin_user() or org.owner == request.user or org.is_verified):
            raise PermissionDenied('You do not have permission to view this organization.')

        serializer = CharityOrganizationSerializer(org)
        return Response(serializer.data)

    def patch(self, request, pk):
        org = self.get_organization(pk, request.user)

        # Only owner can update basic info
        if org.owner != request.user and not request.user.is_admin_user():
            raise PermissionDenied('Only the owner or admin can update this organization.')

        # Prevent updates to verification fields
        verification_fields = [
            'verification_status', 'submitted_at', 'reviewed_at',
            'reviewed_by', 'verified_at', 'rejection_reason'
        ]
        for field in verification_fields:
            if field in request.data:
                raise DRFValidationError(f'Field "{field}" cannot be updated directly.')

        # Don't allow owner change
        if 'owner' in request.data:
            raise DRFValidationError('Owner cannot be changed.')

        serializer = CharityOrganizationSerializer(org, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response(serializer.data)


class CharityOrganizationListView(APIView):
    """
    GET /api/v1/charities/

    List charity organizations.
    - Admins see all
    - Charity owners see their own
    - Donors/Volunteers see only verified organizations
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.is_admin_user():
            queryset = CharityOrganization.objects.select_related('owner', 'reviewed_by').all()
        elif request.user.is_charity():
            queryset = CharityOrganization.objects.select_related('owner', 'reviewed_by').filter(owner=request.user)
        else:
            # Donors and volunteers only see verified organizations
            queryset = CharityOrganization.objects.select_related('owner', 'reviewed_by').filter(
                verification_status=VerificationStatus.VERIFIED
            )

        # Apply filters
        status_filter = request.query_params.get('status')
        if status_filter and request.user.is_admin_user():
            queryset = queryset.filter(verification_status=status_filter)

        serializer = CharityOrganizationSerializer(queryset, many=True)
        return Response(serializer.data)


class VerificationSubmitView(APIView):
    """
    POST /api/v1/charities/{id}/submit/

    Submit organization for verification (charity owner only).
    """

    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            org = CharityOrganization.objects.get(pk=pk)
        except CharityOrganization.DoesNotExist:
            raise NotFound('Charity organization not found.')

        # Check ownership
        if org.owner != request.user:
            raise PermissionDenied('Only the charity owner can submit for verification.')

        serializer = VerificationSubmitSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        old_status = org.verification_status
        try:
            org.submit_for_verification(request.user)
        except DjangoValidationError as e:
            raise DRFValidationError(str(e))

        # Log the submission
        VerificationLog.objects.create(
            organization=org,
            action=VerificationAction.SUBMIT,
            performed_by=request.user,
            from_status=old_status,
            to_status=org.verification_status,
            reason='Submitted for verification',
        )

        response_serializer = CharityOrganizationSerializer(org)
        return Response(response_serializer.data, status=status.HTTP_200_OK)


class VerificationApproveView(APIView):
    """
    POST /api/v1/charities/{id}/approve/

    Approve verification (admin only).
    """

    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        if not request.user.is_admin_user():
            raise PermissionDenied('Only admins can approve verification.')

        try:
            org = CharityOrganization.objects.get(pk=pk)
        except CharityOrganization.DoesNotExist:
            raise NotFound('Charity organization not found.')

        # Admin cannot approve their own organization
        if org.owner == request.user:
            raise PermissionDenied('An organization cannot approve its own verification.')

        serializer = VerificationApproveSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        old_status = org.verification_status
        try:
            org.approve_verification(request.user)
        except DjangoValidationError as e:
            raise DRFValidationError(str(e))

        # Log the approval
        VerificationLog.objects.create(
            organization=org,
            action=VerificationAction.APPROVE,
            performed_by=request.user,
            from_status=old_status,
            to_status=VerificationStatus.VERIFIED,
            reason='Verification approved',
        )

        response_serializer = CharityOrganizationSerializer(org)
        return Response(response_serializer.data, status=status.HTTP_200_OK)


class VerificationRejectView(APIView):
    """
    POST /api/v1/charities/{id}/reject/

    Reject verification (admin only).
    """

    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        if not request.user.is_admin_user():
            raise PermissionDenied('Only admins can reject verification.')

        try:
            org = CharityOrganization.objects.get(pk=pk)
        except CharityOrganization.DoesNotExist:
            raise NotFound('Charity organization not found.')

        # Admin cannot reject their own organization
        if org.owner == request.user:
            raise PermissionDenied('An organization cannot reject its own verification.')

        serializer = VerificationRejectSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        old_status = org.verification_status
        reason = serializer.validated_data['rejection_reason']

        try:
            org.reject_verification(request.user, reason)
        except DjangoValidationError as e:
            raise DRFValidationError(str(e))

        # Log the rejection
        VerificationLog.objects.create(
            organization=org,
            action=VerificationAction.REJECT,
            performed_by=request.user,
            from_status=old_status,
            to_status=VerificationStatus.REJECTED,
            reason=reason,
        )

        response_serializer = CharityOrganizationSerializer(org)
        return Response(response_serializer.data, status=status.HTTP_200_OK)


class VerificationResubmitView(APIView):
    """
    POST /api/v1/charities/{id}/resubmit/

    Resubmit for verification after rejection (charity owner only).
    """

    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            org = CharityOrganization.objects.get(pk=pk)
        except CharityOrganization.DoesNotExist:
            raise NotFound('Charity organization not found.')

        # Check ownership
        if org.owner != request.user:
            raise PermissionDenied('Only the charity owner can resubmit for verification.')

        serializer = VerificationResubmitSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        old_status = org.verification_status
        try:
            org.resubmit_for_verification(request.user)
        except DjangoValidationError as e:
            raise DRFValidationError(str(e))

        # Log the resubmission
        VerificationLog.objects.create(
            organization=org,
            action=VerificationAction.RESUBMIT,
            performed_by=request.user,
            from_status=old_status,
            to_status=VerificationStatus.PENDING,
            reason='Resubmitted after rejection',
        )

        response_serializer = CharityOrganizationSerializer(org)
        return Response(response_serializer.data, status=status.HTTP_200_OK)


class VerificationHistoryView(APIView):
    """
    GET /api/v1/charities/{id}/history/

    Get verification history/audit trail.
    - Owner and admins can see full history
    - Others cannot access
    """

    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            org = CharityOrganization.objects.get(pk=pk)
        except CharityOrganization.DoesNotExist:
            raise NotFound('Charity organization not found.')

        # Only owner and admins can see history
        if not (request.user.is_admin_user() or org.owner == request.user):
            raise PermissionDenied('You do not have permission to view verification history.')

        logs = org.verification_logs.select_related('performed_by').all()
        serializer = VerificationHistorySerializer(logs, many=True)
        return Response(serializer.data)


class MyOrganizationView(APIView):
    """
    GET /api/v1/charities/me/

    Get current user's charity organization.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not request.user.is_charity():
            raise PermissionDenied('Only charity users have an organization.')

        try:
            org = request.user.charity_organization
        except CharityOrganization.DoesNotExist:
            raise NotFound('No charity organization found for this user.')

        serializer = CharityOrganizationSerializer(org)
        return Response(serializer.data)