"""
Serializers for the Donation domain.
"""
from decimal import Decimal
from rest_framework import serializers
from donations.models import Donation, DonationStatus
from campaigns.models import Campaign, CampaignStatus


class DonationSerializer(serializers.ModelSerializer):
    """Read serializer for donations."""

    campaign_title = serializers.CharField(source='campaign.title', read_only=True)
    campaign_image = serializers.SerializerMethodField()
    donor_email = serializers.SerializerMethodField()
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    receipt_id = serializers.SerializerMethodField()
    receipt_number = serializers.SerializerMethodField()

    class Meta:
        model = Donation
        fields = [
            'id',
            'donor',
            'donor_email',
            'campaign',
            'campaign_title',
            'campaign_image',
            'amount',
            'currency',
            'status',
            'status_display',
            'razorpay_order_id',
            'razorpay_payment_id',
            'is_anonymous',
            'message',
            'created_at',
            'updated_at',
            'receipt_id',
            'receipt_number',
        ]
        read_only_fields = fields

    def get_campaign_image(self, obj):
        """Absolute URL for the campaign image, or None when unset."""
        if not obj.campaign.image:
            return None
        request = self.context.get('request')
        if request:
            return request.build_absolute_uri(obj.campaign.image.url)
        return obj.campaign.image.url

    def get_receipt_id(self, obj):
        receipt = getattr(obj, 'receipt', None)
        return receipt.id if receipt else None

    def get_receipt_number(self, obj):
        receipt = getattr(obj, 'receipt', None)
        return receipt.receipt_number if receipt else None

    def get_donor_email(self, obj):
        request = self.context.get('request')
        if obj.is_anonymous:
            # Hide donor email if anonymous, unless requester is the donor, charity owner, or admin
            if request and request.user.is_authenticated:
                user = request.user
                if user == obj.donor or user.is_admin_user() or (user.is_charity() and hasattr(user, 'charity_organization') and obj.campaign.organization == user.charity_organization):
                    return obj.donor.email
            return None
        return obj.donor.email


class DonationInitiateSerializer(serializers.Serializer):
    """Serializer to initiate a donation and get a Razorpay order."""

    campaign = serializers.PrimaryKeyRelatedField(queryset=Campaign.objects.all())
    amount = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=Decimal('1.00'))
    currency = serializers.CharField(max_length=3, default='INR', required=False)
    is_anonymous = serializers.BooleanField(default=False, required=False)
    message = serializers.CharField(max_length=1000, required=False, allow_blank=True)
    idempotency_key = serializers.CharField(max_length=255, required=False, allow_blank=True, allow_null=True)

    def validate_campaign(self, value):
        if value.status != CampaignStatus.ACTIVE:
            raise serializers.ValidationError('Campaign is not active for donations.')
        return value


class DonationVerifySerializer(serializers.Serializer):
    """Serializer to verify Razorpay payment and complete donation."""

    razorpay_payment_id = serializers.CharField(max_length=255)
    razorpay_signature = serializers.CharField(max_length=255)
