"""
Charity Organization model for TrustFund.

Represents a verified charitable organization linked to a Charity-role User.
"""
from django.conf import settings
from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _


class VerificationStatus(models.TextChoices):
    """Verification status for charity organizations."""

    PENDING = 'PENDING', _('Pending')
    VERIFIED = 'VERIFIED', _('Verified')
    REJECTED = 'REJECTED', _('Rejected')


class VerificationAction(models.TextChoices):
    """Actions that can be performed on verification."""

    SUBMIT = 'SUBMIT', _('Submit for verification')
    APPROVE = 'APPROVE', _('Approve verification')
    REJECT = 'REJECT', _('Reject verification')
    RESUBMIT = 'RESUBMIT', _('Resubmit after rejection')


class VerificationLog(models.Model):
    """
    Audit log for verification workflow actions.
    Preserves history of all verification state changes.
    """

    organization = models.ForeignKey(
        'charities.CharityOrganization',
        on_delete=models.CASCADE,
        related_name='verification_logs',
        verbose_name=_('organization'),
    )
    action = models.CharField(
        _('action'),
        max_length=20,
        choices=VerificationAction.choices,
        db_index=True,
    )
    performed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='verification_actions',
        verbose_name=_('performed by'),
    )
    from_status = models.CharField(
        _('from status'),
        max_length=20,
        choices=VerificationStatus.choices,
    )
    to_status = models.CharField(
        _('to status'),
        max_length=20,
        choices=VerificationStatus.choices,
    )
    reason = models.TextField(
        _('reason'),
        blank=True,
        help_text=_('Reason for rejection or other notes'),
    )
    created_at = models.DateTimeField(_('created at'), auto_now_add=True, db_index=True)

    class Meta:
        db_table = 'charity_verification_logs'
        verbose_name = _('verification log')
        verbose_name_plural = _('verification logs')
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['organization', 'created_at'], name='ix_verif_log_org_date'),
        ]

    def __str__(self):
        return f'{self.organization.name} - {self.action} by {self.performed_by}'


class CharityOrganization(models.Model):
    """
    Model representing a charitable organization.

    Linked to a Charity-role User who owns/manages the organization.
    Includes verification workflow.
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

    # Verification workflow
    verification_status = models.CharField(
        _('verification status'),
        max_length=20,
        choices=VerificationStatus.choices,
        default=VerificationStatus.PENDING,
        db_index=True,
        help_text=_('Current verification status of the organization'),
    )
    submitted_at = models.DateTimeField(
        _('submitted at'),
        null=True,
        blank=True,
        help_text=_('Timestamp when organization was submitted for verification'),
    )
    reviewed_at = models.DateTimeField(
        _('reviewed at'),
        null=True,
        blank=True,
        help_text=_('Timestamp when verification was reviewed by admin'),
    )
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='charity_verifications_reviewed',
        verbose_name=_('reviewed by'),
        help_text=_('Admin user who reviewed the verification'),
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

    # Valid state transitions
    VALID_TRANSITIONS = {
        VerificationStatus.PENDING: [VerificationStatus.VERIFIED, VerificationStatus.REJECTED],
        VerificationStatus.REJECTED: [VerificationStatus.PENDING],  # Resubmit after rejection
        # VERIFIED is terminal - no transitions allowed
    }

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

        # Validate state transitions
        if self.pk:
            try:
                old = CharityOrganization.objects.get(pk=self.pk)
                if old.verification_status != self.verification_status:
                    valid_next = self.VALID_TRANSITIONS.get(old.verification_status, [])
                    if self.verification_status not in valid_next:
                        raise ValidationError({
                            'verification_status': _(
                                f"Invalid transition from {old.verification_status} to {self.verification_status}."
                            ),
                        })
            except CharityOrganization.DoesNotExist:
                pass

    def save(self, *args, **kwargs):
        """Override save to set timestamps on status changes."""
        is_new = self.pk is None

        if not is_new:
            try:
                old = CharityOrganization.objects.get(pk=self.pk)
                # Handle status transitions
                if old.verification_status != self.verification_status:
                    if self.verification_status == VerificationStatus.VERIFIED:
                        self.verified_at = timezone.now()
                        self.reviewed_at = timezone.now()
                    elif self.verification_status == VerificationStatus.REJECTED:
                        self.reviewed_at = timezone.now()
                    elif (old.verification_status == VerificationStatus.REJECTED
                          and self.verification_status == VerificationStatus.PENDING):
                        # Resubmit
                        self.submitted_at = timezone.now()
                        self.reviewed_at = None
                        self.reviewed_by = None
                        self.verified_at = None
                        self.rejection_reason = ''
            except CharityOrganization.DoesNotExist:
                pass
        else:
            # New organization - not yet submitted
            pass

        self.full_clean()
        super().save(*args, **kwargs)

    def submit_for_verification(self, user):
        """Submit organization for verification by owner."""
        if not user.is_charity() or user != self.owner:
            from django.core.exceptions import PermissionDenied
            raise PermissionDenied(_('Only the charity owner can submit for verification.'))

        if self.verification_status != VerificationStatus.PENDING:
            from django.core.exceptions import ValidationError
            raise ValidationError(_('Only pending organizations can be submitted.'))

        self.submitted_at = timezone.now()
        self.verification_status = VerificationStatus.PENDING
        self.save()

    def approve_verification(self, admin_user):
        """Approve verification by admin."""
        if not admin_user.is_admin_user():
            from django.core.exceptions import PermissionDenied
            raise PermissionDenied(_('Only admins can approve verification.'))

        if admin_user == self.owner:
            from django.core.exceptions import PermissionDenied
            raise PermissionDenied(_('An organization cannot approve its own verification.'))

        if self.verification_status != VerificationStatus.PENDING:
            from django.core.exceptions import ValidationError
            raise ValidationError(_('Only pending organizations can be approved.'))

        self.verification_status = VerificationStatus.VERIFIED
        self.reviewed_by = admin_user
        self.reviewed_at = timezone.now()
        self.verified_at = timezone.now()
        self.save()

    def reject_verification(self, admin_user, reason):
        """Reject verification by admin."""
        if not admin_user.is_admin_user():
            from django.core.exceptions import PermissionDenied
            raise PermissionDenied(_('Only admins can reject verification.'))

        if admin_user == self.owner:
            from django.core.exceptions import PermissionDenied
            raise PermissionDenied(_('An organization cannot reject its own verification.'))

        if self.verification_status != VerificationStatus.PENDING:
            from django.core.exceptions import ValidationError
            raise ValidationError(_('Only pending organizations can be rejected.'))

        if not reason or not reason.strip():
            from django.core.exceptions import ValidationError
            raise ValidationError(_('Rejection reason is required.'))

        self.verification_status = VerificationStatus.REJECTED
        self.reviewed_by = admin_user
        self.reviewed_at = timezone.now()
        self.rejection_reason = reason.strip()
        self.verified_at = None
        self.save()

    def resubmit_for_verification(self, user):
        """Resubmit after rejection by owner."""
        if not user.is_charity() or user != self.owner:
            from django.core.exceptions import PermissionDenied
            raise PermissionDenied(_('Only the charity owner can resubmit for verification.'))

        if self.verification_status != VerificationStatus.REJECTED:
            from django.core.exceptions import ValidationError
            raise ValidationError(_('Only rejected organizations can be resubmitted.'))

        self.verification_status = VerificationStatus.PENDING
        self.submitted_at = timezone.now()
        self.reviewed_at = None
        self.reviewed_by = None
        self.rejection_reason = ''
        self.verified_at = None
        self.save()

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

    @property
    def can_submit(self):
        """Check if organization can be submitted for verification."""
        return self.verification_status in [VerificationStatus.PENDING, VerificationStatus.REJECTED]

    @property
    def can_be_reviewed(self):
        """Check if organization can be reviewed by admin."""
        return self.verification_status == VerificationStatus.PENDING and self.submitted_at is not None