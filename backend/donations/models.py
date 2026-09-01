"""
Donation model for TrustFund.

A donation links a donor (User) to a Campaign, tracking payment status,
amounts, Razorpay gateway references, and idempotency keys.
"""
from django.db import models
from django.db.models import Q
from django.utils.translation import gettext_lazy as _


class DonationStatus(models.TextChoices):
    """Lifecycle states for a donation payment."""

    PENDING = 'PENDING', _('Pending')
    SUCCESS = 'SUCCESS', _('Success')
    FAILED = 'FAILED', _('Failed')
    REFUNDED = 'REFUNDED', _('Refunded')


class Donation(models.Model):
    """
    Model representing a financial donation to a campaign.

    Tracks payment lifecycle, donor, campaign, amounts, and Razorpay references.
    """

    donor = models.ForeignKey(
        'users.User',
        on_delete=models.PROTECT,
        related_name='donations',
        verbose_name=_('donor'),
        help_text=_('User who made the donation'),
    )
    campaign = models.ForeignKey(
        'campaigns.Campaign',
        on_delete=models.PROTECT,
        related_name='donations',
        verbose_name=_('campaign'),
        help_text=_('Campaign receiving the donation'),
    )

    amount = models.DecimalField(
        _('amount'),
        max_digits=12,
        decimal_places=2,
        help_text=_('Donation amount in currency (must be greater than zero)'),
    )
    currency = models.CharField(
        _('currency'),
        max_length=3,
        default='INR',
        help_text=_('ISO 4217 currency code, e.g. INR'),
    )

    status = models.CharField(
        _('status'),
        max_length=20,
        choices=DonationStatus.choices,
        default=DonationStatus.PENDING,
        db_index=True,
        help_text=_('Payment status of the donation'),
    )

    # Razorpay and payment gateway fields
    razorpay_order_id = models.CharField(
        _('Razorpay order ID'),
        max_length=255,
        unique=True,
        blank=True,
        null=True,
        db_index=True,
        help_text=_('Unique Razorpay order identifier'),
    )
    razorpay_payment_id = models.CharField(
        _('Razorpay payment ID'),
        max_length=255,
        blank=True,
        null=True,
        db_index=True,
        help_text=_('Razorpay payment identifier upon successful capture'),
    )
    razorpay_signature = models.CharField(
        _('Razorpay signature'),
        max_length=255,
        blank=True,
        null=True,
        help_text=_('HMAC SHA256 payment signature from Razorpay'),
    )

    idempotency_key = models.CharField(
        _('idempotency key'),
        max_length=255,
        unique=True,
        blank=True,
        null=True,
        db_index=True,
        help_text=_('Client or server idempotency key to prevent duplicate charges'),
    )

    is_anonymous = models.BooleanField(
        _('is anonymous'),
        default=False,
        help_text=_('Whether donor identity is hidden from public campaign feeds'),
    )
    message = models.TextField(
        _('message'),
        blank=True,
        max_length=1000,
        help_text=_('Optional encouraging message or note to the campaign'),
    )

    created_at = models.DateTimeField(_('created at'), auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(_('updated at'), auto_now=True)

    class Meta:
        db_table = 'donations'
        verbose_name = _('donation')
        verbose_name_plural = _('donations')
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['donor', 'created_at'], name='ix_donation_donor_created'),
            models.Index(fields=['campaign', 'status'], name='ix_donation_campaign_status'),
            models.Index(fields=['status', 'created_at'], name='ix_donation_status_created'),
        ]
        constraints = [
            models.CheckConstraint(
                condition=Q(amount__gt=0),
                name='cx_donation_amount_gt_zero',
                violation_error_message=_('Donation amount must be greater than zero.'),
            ),
        ]

    def __str__(self):
        return f'Donation {self.pk or "New"} - {self.amount} {self.currency} ({self.status}) for Campaign {self.campaign_id}'
