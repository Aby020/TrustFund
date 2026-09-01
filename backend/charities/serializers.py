"""
Serializers for Charity Organization verification workflow.
"""
from rest_framework import serializers
from rest_framework.exceptions import ValidationError as DRFValidationError

from users.models import Role, User
from charities.models import CharityOrganization, VerificationStatus, VerificationAction, VerificationLog


class CharityOrganizationSerializer(serializers.ModelSerializer):
    """Serializer for CharityOrganization (read-safe fields)."""

    owner_email = serializers.EmailField(source='owner.email', read_only=True)
    owner_name = serializers.SerializerMethodField()
    verification_status_display = serializers.CharField(source='get_verification_status_display', read_only=True)
    reviewed_by_name = serializers.SerializerMethodField()

    class Meta:
        model = CharityOrganization
        fields = [
            'id',
            'owner',
            'owner_email',
            'owner_name',
            'name',
            'description',
            'email',
            'phone',
            'website',
            'address',
            'city',
            'state',
            'country',
            'registration_number',
            'verification_status',
            'verification_status_display',
            'submitted_at',
            'reviewed_at',
            'reviewed_by',
            'reviewed_by_name',
            'verified_at',
            'rejection_reason',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id',
            'owner',
            'verification_status',
            'submitted_at',
            'reviewed_at',
            'reviewed_by',
            'verified_at',
            'rejection_reason',
            'created_at',
            'updated_at',
        ]

    def get_owner_name(self, obj):
        return obj.owner.get_full_name()

    def get_reviewed_by_name(self, obj):
        if obj.reviewed_by:
            return obj.reviewed_by.get_full_name()
        return None


class CharityOrganizationCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating a CharityOrganization."""

    class Meta:
        model = CharityOrganization
        fields = [
            'name',
            'description',
            'email',
            'phone',
            'website',
            'address',
            'city',
            'state',
            'country',
            'registration_number',
        ]

    def validate_owner(self, value):
        """Ensure owner is a Charity user."""
        if not value.is_charity():
            raise DRFValidationError('Only users with CHARITY role can own a charity organization.')
        return value


class VerificationSubmitSerializer(serializers.Serializer):
    """Serializer for submitting organization for verification."""

    def validate(self, attrs):
        """Validate that the organization can be submitted."""
        # The view will check the organization and user
        return attrs


class VerificationApproveSerializer(serializers.Serializer):
    """Serializer for approving verification (admin only)."""

    def validate(self, attrs):
        return attrs


class VerificationRejectSerializer(serializers.Serializer):
    """Serializer for rejecting verification (admin only)."""

    rejection_reason = serializers.CharField(
        required=True,
        min_length=10,
        max_length=2000,
        help_text='Reason for rejecting the verification (minimum 10 characters)',
    )

    def validate_rejection_reason(self, value):
        """Validate rejection reason."""
        if not value or not value.strip():
            raise DRFValidationError('Rejection reason is required.')
        return value.strip()


class VerificationResubmitSerializer(serializers.Serializer):
    """Serializer for resubmitting after rejection."""

    def validate(self, attrs):
        return attrs


class VerificationHistorySerializer(serializers.ModelSerializer):
    """Serializer for verification history/audit trail."""

    action_display = serializers.CharField(source='get_action_display', read_only=True)
    performed_by_name = serializers.SerializerMethodField()

    class Meta:
        model = VerificationLog
        fields = [
            'id',
            'action',
            'action_display',
            'performed_by',
            'performed_by_name',
            'from_status',
            'to_status',
            'reason',
            'created_at',
        ]
        read_only_fields = fields

    def get_performed_by_name(self, obj):
        if obj.performed_by:
            return obj.performed_by.get_full_name()
        return None