"""
Campaign model for TrustFund.

A campaign is a fundraising effort owned by a verified CharityOrganization.
The raised amount is controlled by the donations domain (not implemented yet)
and must never be writable through the regular campaign APIs.
"""
from django.conf import settings
from django.db import models
from django.db.models import Q
from django.utils.translation import gettext_lazy as _


class CampaignCategory(models.TextChoices):
    """Categories a campaign can belong to."""

    MEDICAL = 'MEDICAL', _('Medical')
    EDUCATION = 'EDUCATION', _('Education')
    DISASTER_RELIEF = 'DISASTER_RELIEF', _('Disaster Relief')
    ENVIRONMENT = 'ENVIRONMENT', _('Environment')
    ANIMALS = 'ANIMALS', _('Animals')
    COMMUNITY = 'COMMUNITY', _('Community')
    CHILDREN = 'CHILDREN', _('Children')
    FOOD = 'FOOD', _('Food & Hunger')
    POVERTY = 'POVERTY', _('Poverty Alleviation')
    OTHER = 'OTHER', _('Other')


class CampaignStatus(models.TextChoices):
    """Lifecycle states for a campaign."""

    DRAFT = 'DRAFT', _('Draft')
    ACTIVE = 'ACTIVE', _('Active')
    COMPLETED = 'COMPLETED', _('Completed')
    EXPIRED = 'EXPIRED', _('Expired')
    CANCELLED = 'CANCELLED', _('Cancelled')


class Campaign(models.Model):
    """
    Model representing a fundraising campaign.

    Linked to a verified CharityOrganization. Only the organization owner can
    create and manage campaigns. Financial fields (raised_amount) are
    controlled by the donations domain, not by campaign write APIs.
    """

    # Ownership - must belong to a charity organization
    organization = models.ForeignKey(
        'charities.CharityOrganization',
        on_delete=models.CASCADE,
        related_name='campaigns',
        verbose_name=_('organization'),
        help_text=_('Charity organization running this campaign'),
    )

    # Campaign identity
    title = models.CharField(
        _('title'),
        max_length=255,
        help_text=_('Short public title for the campaign'),
    )
    description = models.TextField(
        _('description'),
        blank=True,
        max_length=5000,
        help_text=_('Detailed description of the campaign and its purpose'),
    )

    # Classification and goal
    category = models.CharField(
        _('category'),
        max_length=30,
        choices=CampaignCategory.choices,
        db_index=True,
        help_text=_('Category the campaign belongs to'),
    )
    goal_amount = models.DecimalField(
        _('goal amount'),
        max_digits=12,
        decimal_places=2,
        help_text=_('Target amount to raise (must be greater than zero)'),
    )
    raised_amount = models.DecimalField(
        _('raised amount'),
        max_digits=12,
        decimal_places=2,
        default=0,
        help_text=_(
            'Amount raised so far. Controlled by the donations domain — '
            'never writable through campaign endpoints.'
        ),
    )

    # Where and when
    location = models.CharField(
        _('location'),
        max_length=255,
        help_text=_('City/region where the campaign is based'),
    )

    # Media — optional cover image uploaded to MEDIA_ROOT/campaigns/
    image = models.ImageField(
        _('image'),
        upload_to='campaigns/',
        blank=True,
        null=True,
        help_text=_('Cover image displayed with the campaign'),
    )
    start_date = models.DateField(
        _('start date'),
        help_text=_('First day the campaign runs'),
    )
    end_date = models.DateField(
        _('end date'),
        help_text=_('Last day the campaign accepts donations'),
    )

    # Lifecycle
    status = models.CharField(
        _('status'),
        max_length=20,
        choices=CampaignStatus.choices,
        default=CampaignStatus.DRAFT,
        db_index=True,
        help_text=_('Current lifecycle state of the campaign'),
    )

    # Timestamps
    created_at = models.DateTimeField(_('created at'), auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(_('updated at'), auto_now=True)

    # Valid lifecycle transitions.
    VALID_TRANSITIONS = {
        CampaignStatus.DRAFT: [CampaignStatus.ACTIVE, CampaignStatus.CANCELLED],
        CampaignStatus.ACTIVE: [CampaignStatus.COMPLETED, CampaignStatus.EXPIRED, CampaignStatus.CANCELLED],
        # Terminal states - no transitions allowed
        CampaignStatus.COMPLETED: [],
        CampaignStatus.EXPIRED: [],
        CampaignStatus.CANCELLED: [],
    }

    class Meta:
        db_table = 'campaigns'
        verbose_name = _('campaign')
        verbose_name_plural = _('campaigns')
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['organization', 'created_at'], name='ix_campaign_org_created'),
            models.Index(fields=['status', 'created_at'], name='ix_campaign_status_created'),
            models.Index(fields=['category', 'status'], name='ix_campaign_category_status'),
        ]
        constraints = [
            models.CheckConstraint(
                condition=Q(goal_amount__gt=0),
                name='cx_campaign_goal_gt_zero',
                violation_error_message=_('Goal amount must be greater than zero.'),
            ),
            models.CheckConstraint(
                condition=Q(raised_amount__gte=0),
                name='cx_campaign_raised_gte_zero',
                violation_error_message=_('Raised amount cannot be negative.'),
            ),
        ]

    def __str__(self):
        return f'{self.organization.name}: {self.title}'

    def clean(self):
        """Validate the model before saving."""
        from django.core.exceptions import ValidationError

        super().clean()

        if self.start_date and self.end_date and self.end_date < self.start_date:
            raise ValidationError({
                'end_date': _('End date cannot be before start date.'),
            })

        if self.goal_amount is not None and self.goal_amount <= 0:
            raise ValidationError({
                'goal_amount': _('Goal amount must be greater than zero.'),
            })

        if self.raised_amount is not None and self.raised_amount < 0:
            raise ValidationError({
                'raised_amount': _('Raised amount cannot be negative.'),
            })

        # Validate lifecycle transitions on existing records only.
        if self.pk and self.status:
            try:
                old = type(self).objects.get(pk=self.pk)
                if old.status != self.status:
                    valid_next = self.VALID_TRANSITIONS.get(old.status, [])
                    if self.status not in valid_next:
                        raise ValidationError({
                            'status': _(
                                f'Invalid status transition from {old.status} to {self.status}.'
                            ),
                        })
            except type(self).DoesNotExist:
                pass

    def save(self, *args, **kwargs):
        """Persist after full validation (matches the charities pattern)."""
        self.full_clean()
        super().save(*args, **kwargs)

    @classmethod
    def can_transition(cls, current_status, new_status):
        """Whether new_status is a valid transition from current_status."""
        return new_status in cls.VALID_TRANSITIONS.get(current_status, [])


class CampaignUpdate(models.Model):
    """
    Model representing an update for a fundraising campaign.
    """

    campaign = models.ForeignKey(
        'Campaign',
        on_delete=models.CASCADE,
        related_name='updates',
        verbose_name=_('campaign'),
    )
    title = models.CharField(
        _('title'),
        max_length=255,
    )
    content = models.TextField(
        _('content'),
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        verbose_name=_('created by'),
    )
    created_at = models.DateTimeField(_('created at'), auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(_('updated at'), auto_now=True)

    class Meta:
        db_table = 'campaign_updates'
        verbose_name = _('campaign update')
        verbose_name_plural = _('campaign updates')
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['campaign', 'created_at'], name='ix_camp_update_camp_date'),
        ]

    def __str__(self):
        return f'{self.campaign.title}: {self.title}'
