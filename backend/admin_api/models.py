"""
AuditLog — the platform-wide audit trail for admin-visible actions.

A cross-cutting record of state-changing events (verification decisions,
campaign lifecycle) so administrators can review who did what and when.
Entries are written at the point of action (in the originating view) via
`record_audit`, which keeps the admitting actor correct and bounds the file
to actions that actually happened.

This is deliberately append-only from the application's perspective: no
update/delete API is exposed for audit entries.
"""
from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _


class AuditAction(models.TextChoices):
    """High-level action categories recorded in the audit log."""

    VERIFICATION_SUBMIT = 'VERIFICATION_SUBMIT', _('Verification submitted')
    VERIFICATION_APPROVE = 'VERIFICATION_APPROVE', _('Verification approved')
    VERIFICATION_REJECT = 'VERIFICATION_REJECT', _('Verification rejected')
    VERIFICATION_RESUBMIT = 'VERIFICATION_RESUBMIT', _('Verification resubmitted')
    CAMPAIGN_CREATED = 'CAMPAIGN_CREATED', _('Campaign created')
    CAMPAIGN_UPDATED = 'CAMPAIGN_UPDATED', _('Campaign updated')
    CAMPAIGN_CANCELLED = 'CAMPAIGN_CANCELLED', _('Campaign cancelled')
    CAMPAIGN_DELETED = 'CAMPAIGN_DELETED', _('Campaign deleted')


class AuditLog(models.Model):
    """One immutable row describing a single state-changing event."""

    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='audit_entries',
        verbose_name=_('actor'),
        help_text=_('User who performed the action (null if not applicable).'),
    )
    action = models.CharField(
        _('action'),
        max_length=40,
        choices=AuditAction.choices,
        db_index=True,
    )
    resource_type = models.CharField(
        _('resource type'),
        max_length=50,
        db_index=True,
        help_text=_('Django model name of the affected resource, e.g. CharityOrganization.'),
    )
    resource_label = models.CharField(
        _('resource label'),
        max_length=255,
        help_text=_('Human-readable label of the affected resource (e.g. organization name).'),
    )
    detail = models.TextField(
        _('detail'),
        blank=True,
        help_text=_('Optional human-readable context for the event.'),
    )
    created_at = models.DateTimeField(_('created at'), auto_now_add=True, db_index=True)

    class Meta:
        db_table = 'audit_logs'
        verbose_name = _('audit log entry')
        verbose_name_plural = _('audit log entries')
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['action', 'created_at'], name='ix_audit_action_date'),
            models.Index(fields=['resource_type', 'resource_label'], name='ix_audit_resource'),
        ]

    def __str__(self):
        return f'{self.action} on {self.resource_label} by {self.actor}'


def record_audit(*, actor, action, resource_type, resource_label, detail=''):
    """
    Append an entry to the audit trail.

    Convenience used by the originating views (charities verification and
    campaign lifecycle) so the actor is the real request user and the entry
    captures exactly what happened.
    """
    return AuditLog.objects.create(
        actor=actor,
        action=action,
        resource_type=resource_type,
        resource_label=resource_label,
        detail=detail,
    )