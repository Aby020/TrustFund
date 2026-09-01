"""
Charity Organization model for TrustFund.

Represents a verified charitable organization linked to a Charity-role User.
"""
from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _


class VerificationStatus(models.TextChoices):
    """Verification status for charity organizations."""

    PENDING = 'PENDING', _('Pending')
    VERIFIED = 'VERIFIED', _('Verified')
    REJECTED = 'REJECTED', _('Rejected')


class CharityOrganization(models.Model):
    """
    Model representing a charitable organization.

    Linked to a Charity-role User who owns/manages the organization.
    Includes verification workflow foundation.
    """

    # Owner relationship - must be a Charity-role user
    owner = models.OneToOneField(
        'users.User',
        on_delete=models.PROTECT,
        related_name='charity_organization',
        limit_choices_to={'role': 'CHARITY'},
        verbose_name=_('owner'),
        help_text=_('Charity user who owns this organization'),
    )

    # Organization identity
    name = models.CharField(
        _('organization name'),
        max_length=255,
        unique=True,
        db_index=True,
        help_text=_('Legal name of the charitable organization'),
    )
    description = models.TextField(
        _('description'),
        blank=True,
        help_text=_('Description of the organization mission and activities'),
    )

    # Contact information
    email = models.EmailField(
        _('contact email'),
        max_length=255,
        help_text=_('Primary contact email for the organization'),
    )
    phone = models.CharField(
        _('phone number'),
        max_length=50,
        blank=True,
        help_text=_('Primary contact phone number'),
    )
    website = models.URLField(
        _('website'),
        max_length=500,
        blank=True,
        help_text=_('Organization website URL'),
    )

    # Address
    address = models.CharField(
        _('street address'),
        max_length=500,
        blank=True,
        help_text=_('Street address of the organization'),
    )
    city = models.CharField(
        _('city'),
        max_length=100,
        blank=True,
    )
    state = models.CharField(
        _('state/province'),
        max_length=100,
        blank=True,
    )
    country = models.CharField(
        _('country'),
        max_length=100,
        default='United States',
        help_text=_('Country where the organization is registered'),
    )

    # Registration details
    registration_number = models.CharField(
        _('registration number'),
        max_length=100,
        unique=True,
        db_index=True,
        help_text=_('Government registration/charity number'),
    )

    # Verification workflow foundation
    verification_status = models.CharField(
        _('verification status'),
        max_length=20,
        choices=VerificationStatus.choices,
        default=VerificationStatus.PENDING,
        db_index=True,
        help_text=_('Current verification status of the organization'),
    )
    verified_at = models.DateTimeField(
        _('verified at'),
        null=True,
        blank=True,
        help_text=_('Timestamp when organization was verified'),
    )
    rejection_reason = models.TextField(
        _('rejection reason'),
        blank=True,
        help_text=_('Reason for rejection if verification status is REJECTED'),
    )

    # Timestamps
    created_at = models.DateTimeField(_('created at'), auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(_('updated at'), auto_now=True)

    class Meta:
        db_table = 'charity_organizations'
        verbose_name = _('charity organization')
        verbose_name_plural = _('charity organizations')
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['verification_status', 'created_at'], name='ix_charity_org_status_date'),
            models.Index(fields=['country', 'city'], name='ix_charity_org_location'),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['owner'],
                name='uq_charity_org_owner',
                violation_error_message='A charity user can only own one organization.',
            ),
        ]

    def __str__(self):
        return self.name

    def clean(self):
        """Validate model before saving."""
        from django.core.exceptions import ValidationError

        super().clean()

        # Ensure owner is a Charity user
        if self.owner_id and not self.owner.is_charity():
            raise ValidationError({
                'owner': _('Only users with CHARITY role can own a charity organization.'),
            })

        # Rejection reason required for REJECTED status
        if self.verification_status == VerificationStatus.REJECTED and not self.rejection_reason:
            raise ValidationError({
                'rejection_reason': _('Rejection reason is required when status is REJECTED.'),
            })

        # Rejection reason should be empty for non-REJECTED status
        if self.verification_status != VerificationStatus.REJECTED and self.rejection_reason:
            raise ValidationError({
                'rejection_reason': _('Rejection reason should only be set when status is REJECTED.'),
            })

    def save(self, *args, **kwargs):
        """Override save to set verified_at when status changes to VERIFIED."""
        if self.pk:
            try:
                old = CharityOrganization.objects.get(pk=self.pk)
                if (old.verification_status != VerificationStatus.VERIFIED
                        and self.verification_status == VerificationStatus.VERIFIED
                        and not self.verified_at):
                    self.verified_at = timezone.now()
            except CharityOrganization.DoesNotExist:
                pass

        self.full_clean()
        super().save(*args, **kwargs)

    @property
    def is_verified(self):
        """Check if organization is verified."""
        return self.verification_status == VerificationStatus.VERIFIED

    @property
    def is_pending(self):
        """Check if organization is pending verification."""
        return self.verification_status == VerificationStatus.PENDING

    @property
    def is_rejected(self):
        """Check if organization is rejected."""
        return self.verification_status == VerificationStatus.REJECTED