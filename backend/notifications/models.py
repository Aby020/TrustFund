"""
Notification model for TrustFund.
"""
from django.conf import settings
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from django.db import models
from django.utils.translation import gettext_lazy as _


class NotificationType(models.TextChoices):
    """Types of notifications supported by the system."""

    DONATION_SUCCESSFUL = 'DONATION_SUCCESSFUL', _('Donation Successful')
    CAMPAIGN_MILESTONE = 'CAMPAIGN_MILESTONE', _('Campaign Milestone')
    CAMPAIGN_UPDATE = 'CAMPAIGN_UPDATE', _('Campaign Update')
    CAMPAIGN_ENDING_SOON = 'CAMPAIGN_ENDING_SOON', _('Campaign Ending Soon')
    VOLUNTEER_APPROVED = 'VOLUNTEER_APPROVED', _('Volunteer Application Approved')
    VOLUNTEER_REJECTED = 'VOLUNTEER_REJECTED', _('Volunteer Application Rejected')
    RECEIPT_GENERATED = 'RECEIPT_GENERATED', _('Receipt Generated')


class Notification(models.Model):
    """
    Model representing user notifications.
    Supports generic relation to related objects (donation, campaign, update, etc.).
    """

    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notifications',
        verbose_name=_('recipient'),
        db_index=True,
    )
    notification_type = models.CharField(
        _('notification type'),
        max_length=50,
        choices=NotificationType.choices,
        db_index=True,
    )
    title = models.CharField(
        _('title'),
        max_length=255,
    )
    message = models.TextField(
        _('message'),
    )

    # Generic foreign key for related object reference
    content_type = models.ForeignKey(
        ContentType,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
    )
    object_id = models.PositiveIntegerField(
        null=True,
        blank=True,
    )
    content_object = GenericForeignKey('content_type', 'object_id')

    is_read = models.BooleanField(
        _('is read'),
        default=False,
        db_index=True,
    )
    created_at = models.DateTimeField(
        _('created at'),
        auto_now_add=True,
        db_index=True,
    )

    class Meta:
        db_table = 'notifications'
        verbose_name = _('notification')
        verbose_name_plural = _('notifications')
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['recipient', 'is_read', 'created_at'], name='ix_notif_recipient_read_date'),
        ]

    def __str__(self):
        return f'{self.recipient.email}: {self.title} ({self.notification_type})'

    @classmethod
    def create_notification(
        cls,
        recipient,
        notification_type,
        title,
        message,
        content_object=None,
        check_duplicate=True,
    ):
        """
        Create a notification with idempotent duplicate protection.
        If check_duplicate is True, prevents creating identical unread notifications
        for the same recipient, type, and related object within a short window or existence.
        """
        if check_duplicate and content_object:
            ct = ContentType.objects.get_for_model(content_object)
            existing = cls.objects.filter(
                recipient=recipient,
                notification_type=notification_type,
                content_type=ct,
                object_id=content_object.pk,
                is_read=False,
            ).first()
            if existing:
                return existing

        content_type_obj = ContentType.objects.get_for_model(content_object) if content_object else None
        object_id_val = content_object.pk if content_object else None

        return cls.objects.create(
            recipient=recipient,
            notification_type=notification_type,
            title=title,
            message=message,
            content_type=content_type_obj,
            object_id=object_id_val,
        )
