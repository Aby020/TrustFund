"""
Signals for the notifications app (or handling event triggers).
"""
import logging

from django.db.models.signals import post_save
from django.dispatch import receiver
from campaigns.models import CampaignUpdate
from notifications.tasks import send_notification_task
from donations.models import Donation
from volunteers.models import VolunteerApplication

logger = logging.getLogger(__name__)


def _enqueue_notification(task, **kwargs):
    """
    Deliver a notification task without letting a delivery failure escape.

    With ``CELERY_TASK_ALWAYS_EAGER=True`` (the production setting — there is no
    broker) ``.delay()`` runs synchronously inside the caller's transaction. If a
    notification task raised there, it would roll back the surrounding commit —
    e.g. a donation marked SUCCESS, or a campaign update. Notifications are
    best-effort: a broker or DB hiccup must never undo a payment.
    """
    try:
        task.delay(**kwargs)
    except Exception as exc:  # pragma: no cover - defensive; see docstring
        logger.error(f'Notification delivery failed (task at risk of rollback): {exc}')


@receiver(post_save, sender=CampaignUpdate)
def handle_campaign_update_created(sender, instance, created, **kwargs):
    """
    When a CampaignUpdate is created, notify donors who have donated to this campaign
    and followers/interested users asynchronously.
    """
    if not created:
        return

    campaign = instance.campaign
    # Find unique donors who donated to this campaign
    donor_ids = Donation.objects.filter(
        campaign=campaign,
        status='SUCCESS'
    ).values_list('donor_id', flat=True).distinct()

    for donor_id in donor_ids:
        _enqueue_notification(
            send_notification_task,
            recipient_id=donor_id,
            notification_type='CAMPAIGN_UPDATE',
            title=f'Update on {campaign.title}: {instance.title}',
            message=instance.content[:300] + ('...' if len(instance.content) > 300 else ''),
            content_type_id=None,  # Or pass content_type for campaign update
            object_id=None,
        )


@receiver(post_save, sender=Donation)
def handle_donation_successful(sender, instance, created, **kwargs):
    """
    When a donation becomes successful, send success notification to donor
    and milestone/new donation notification to charity owner.
    """
    if instance.status == 'SUCCESS':
        # Notify donor
        if instance.donor:
            _enqueue_notification(
                send_notification_task,
                recipient_id=instance.donor.id,
                notification_type='DONATION_SUCCESSFUL',
                title='Donation Successful!',
                message=f'Thank you for your donation of ₹{instance.amount} to {instance.campaign.title}.',
                content_type_id=None,
                object_id=None,
            )

        # Notify charity owner
        charity_owner = instance.campaign.organization.owner
        if charity_owner:
            _enqueue_notification(
                send_notification_task,
                recipient_id=charity_owner.id,
                notification_type='CAMPAIGN_MILESTONE', # or similar
                title='New Donation Received',
                message=f'Received ₹{instance.amount} for campaign {instance.campaign.title}.',
                content_type_id=None,
                object_id=None,
            )


@receiver(post_save, sender=VolunteerApplication)
def handle_volunteer_application_status_change(sender, instance, created, **kwargs):
    """
    Notify volunteer when their application is approved or rejected.
    """
    if not created:
        if instance.status == 'APPROVED':
            _enqueue_notification(
                send_notification_task,
                recipient_id=instance.volunteer.id,
                notification_type='VOLUNTEER_APPROVED',
                title='Volunteer Application Approved',
                message=f'Your application to volunteer for {instance.opportunity.title} has been approved!',
                content_type_id=None,
                object_id=None,
            )
        elif instance.status == 'REJECTED':
            _enqueue_notification(
                send_notification_task,
                recipient_id=instance.volunteer.id,
                notification_type='VOLUNTEER_REJECTED',
                title='Volunteer Application Update',
                message=f'Your application to volunteer for {instance.opportunity.title} was not approved at this time.',
                content_type_id=None,
                object_id=None,
            )
