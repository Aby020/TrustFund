"""
Celery tasks for asynchronous notification delivery and other background jobs.
"""
from celery import shared_task
import logging

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_notification_task(
    self,
    recipient_id,
    notification_type,
    title,
    message,
    content_type_id=None,
    object_id=None,
):
    """
    Asynchronous task to create and deliver a notification safely.
    Fails gracefully without raising exceptions that break transactions.
    """
    try:
        from django.contrib.auth import get_user_model
        from django.contrib.contenttypes.models import ContentType
        from notifications.models import Notification

        User = get_user_model()
        try:
            recipient = User.objects.get(pk=recipient_id)
        except User.DoesNotExist:
            logger.error(f'Notification recipient with id {recipient_id} does not exist.')
            return

        content_object = None
        if content_type_id and object_id:
            try:
                ct = ContentType.objects.get_for_id(content_type_id)
                content_object = ct.get_object_for_this_type(pk=object_id)
            except Exception as e:
                logger.warning(f'Could not resolve generic foreign key for notification: {e}')

        Notification.create_notification(
            recipient=recipient,
            notification_type=notification_type,
            title=title,
            message=message,
            content_object=content_object,
            check_duplicate=True,
        )
        logger.info(f'Notification sent successfully to user {recipient_id} ({notification_type})')
    except Exception as exc:
        logger.error(f'Error sending notification: {exc}')
        raise self.retry(exc=exc)
