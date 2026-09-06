"""
Serializers for the Campaign domain.

Separate read and write serializers. Financial fields (raised_amount) and
ownership (organization) are read-only in every write path — the donations
domain controls financial updates.
"""
from decimal import Decimal

from rest_framework import serializers

from campaigns.models import Campaign, CampaignCategory, CampaignStatus, CampaignUpdate


class CampaignSerializer(serializers.ModelSerializer):
    """Read serializer for campaign list/detail (safe public fields)."""

    organization_name = serializers.CharField(source='organization.name', read_only=True)
    organization_verified = serializers.BooleanField(
        source='organization.is_verified', read_only=True
    )
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    image = serializers.SerializerMethodField()

    class Meta:
        model = Campaign
        fields = [
            'id',
            'organization',
            'organization_name',
            'organization_verified',
            'title',
            'description',
            'category',
            'category_display',
            'goal_amount',
            'raised_amount',
            'location',
            'image',
            'start_date',
            'end_date',
            'status',
            'status_display',
            'created_at',
            'updated_at',
        ]
        read_only_fields = fields

    def get_image(self, obj):
        """Return an absolute URL for the campaign image when one is set."""
        if not obj.image:
            return None
        request = self.context.get('request')
        if request:
            return request.build_absolute_uri(obj.image.url)
        return obj.image.url


class CampaignWriteSerializer(serializers.ModelSerializer):
    """
    Base write serializer for campaigns.

    - status is read-only on every write path. On create the view assigns
      ACTIVE for verified organizations (never a client-supplied value); a
      subclass adds status for updates via validated transitions.
    - organization/raised_amount are read-only; the view assigns the caller's
      verified charity organization and the donations domain mutates the
      raised amount.
    """

    organization = serializers.PrimaryKeyRelatedField(read_only=True)
    organization_name = serializers.CharField(source='organization.name', read_only=True)
    raised_amount = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    goal_amount = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=Decimal('0.01'))
    category = serializers.ChoiceField(choices=CampaignCategory.choices)
    status = serializers.CharField(read_only=True)

    class Meta:
        model = Campaign
        fields = [
            'organization',
            'organization_name',
            'raised_amount',
            'title',
            'description',
            'category',
            'goal_amount',
            'location',
            'image',
            'start_date',
            'end_date',
            'status',
        ]

    def validate_title(self, value):
        """Ensure a usable, non-whitespace title."""
        if not value or not value.strip():
            raise serializers.ValidationError('Title cannot be empty.')
        return value.strip()

    def validate_description(self, value):
        """Normalize description to empty string instead of whitespace."""
        if not value or not value.strip():
            return ''
        return value.strip()

    def validate_location(self, value):
        """Ensure a usable, non-whitespace location."""
        if not value or not value.strip():
            raise serializers.ValidationError('Location cannot be empty.')
        return value.strip()

    def validate_goal_amount(self, value):
        """Prevent dropping the goal below the amount already raised."""
        if self.instance is not None and value is not None:
            if value < self.instance.raised_amount:
                raise serializers.ValidationError(
                    'Goal amount cannot be less than the amount already raised.'
                )
        return value

    ALLOWED_IMAGE_MIME_TYPES = ('image/jpeg', 'image/png', 'image/gif', 'image/webp')

    def validate_image(self, value):
        """
        Enforce the 5 MB upload limit and a safe image-format whitelist.

        The MIME type is client-declared and is not a security boundary on its
        own — Django's ImageField re-verifies the decoded image with Pillow on
        save — but rejecting unknown types here keeps arbitrary/surprise file
        content out of the media store and matches the public image formats the
        frontend advertises.
        """
        if value is None:
            return value
        if value.size > 5 * 1024 * 1024:
            raise serializers.ValidationError('Image must be 5 MB or smaller.')
        if value.content_type not in self.ALLOWED_IMAGE_MIME_TYPES:
            raise serializers.ValidationError(
                'Image must be a JPEG, PNG, GIF, or WebP file.'
            )
        return value

    def validate(self, attrs):
        """Cross-field validation: end date must not precede start date."""
        start = attrs.get('start_date')
        end = attrs.get('end_date')
        if start is None and self.instance is not None:
            start = self.instance.start_date
        if end is None and self.instance is not None:
            end = self.instance.end_date
        if start is not None and end is not None and end < start:
            raise serializers.ValidationError({
                'end_date': 'End date cannot be before start date.',
            })
        return attrs


class CampaignCreateSerializer(CampaignWriteSerializer):
    """Write serializer for creating a campaign (status is view-assigned)."""


class CampaignUpdateSerializer(CampaignWriteSerializer):
    """Write serializer for updating a campaign (status via transitions)."""

    status = serializers.ChoiceField(choices=CampaignStatus.choices, required=False)

    class Meta(CampaignWriteSerializer.Meta):
        fields = CampaignWriteSerializer.Meta.fields + ['status']

    def validate_status(self, value):
        """Validate the lifecycle transition against the current status."""
        if self.instance is not None:
            if value != self.instance.status and not Campaign.can_transition(
                self.instance.status, value
            ):
                raise serializers.ValidationError(
                    f'Invalid status transition from {self.instance.status} to {value}.'
                )
        return value


class CampaignUpdateReadSerializer(serializers.ModelSerializer):
    """Serializer for reading campaign updates."""

    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    campaign_title = serializers.CharField(source='campaign.title', read_only=True)

    class Meta:
        model = CampaignUpdate
        fields = [
            'id',
            'campaign',
            'campaign_title',
            'title',
            'content',
            'created_by',
            'created_by_name',
            'created_at',
            'updated_at',
        ]
        read_only_fields = fields


class CampaignUpdateWriteSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating campaign updates."""

    campaign = serializers.PrimaryKeyRelatedField(queryset=Campaign.objects.all(), required=False)
    title = serializers.CharField(max_length=255)
    content = serializers.CharField()

    class Meta:
        model = CampaignUpdate
        fields = [
            'campaign',
            'title',
            'content',
        ]

    def validate_title(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError('Title cannot be empty.')
        return value.strip()

    def validate_content(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError('Content cannot be empty.')
        return value.strip()
