"""
Tests for the notifications domain.

Focus: the signal handlers must never let a background-notification delivery
failure escape into the caller's transaction. With ``CELERY_TASK_ALWAYS_EAGER``
(a broker-less production) ``.delay()`` runs synchronously inside the receiver;
if it raised, a donation marked SUCCESS or a campaign update would be rolled
back. ``notifications.signals._enqueue_notification`` absorbs those failures.
"""
from datetime import date, timedelta
from decimal import Decimal
from unittest.mock import patch

import pytest

from campaigns.models import Campaign, CampaignCategory, CampaignStatus
from charities.models import CharityOrganization, VerificationStatus
from donations.models import Donation, DonationStatus
from users.models import User, Role

import notifications.signals as signals


@pytest.mark.django_db
class TestNotificationDeliverySafety:
    """Duplicate-subscription-free tests (Django dedupes signal receivers)."""

    def _donation(self):
        donor = User.objects.create_user(
            email='donor@notif.test', password='SecurePass123!', role=Role.DONOR
        )
        owner = User.objects.create_user(
            email='owner@notif.test', password='SecurePass123!', role=Role.CHARITY
        )
        org = CharityOrganization.objects.create(
            owner=owner,
            name='Safe Org',
            email='org@notif.test',
            registration_number='REG-SAFE',
            description='Test org.',
            verification_status=VerificationStatus.VERIFIED,
        )
        today = date.today()
        campaign = Campaign.objects.create(
            organization=org,
            title='Safe Campaign',
            description='Test campaign.',
            category=CampaignCategory.COMMUNITY,
            goal_amount=Decimal('1000.00'),
            location='Village',
            start_date=today,
            end_date=today + timedelta(days=30),
            status=CampaignStatus.ACTIVE,
        )
        return donor, owner, campaign

    def test_notification_broker_failure_does_not_break_donation(self):
        """
        A failing ``.delay()`` (no broker, eager mode) must not prevent the
        donation itself from being created and persisted as SUCCESS.
        """
        donor, owner, campaign = self._donation()
        with patch.object(
            signals.send_notification_task, 'delay', side_effect=RuntimeError('no broker')
        ):
            donation = Donation.objects.create(
                donor=donor,
                campaign=campaign,
                amount=Decimal('100.00'),
                status=DonationStatus.SUCCESS,
                razorpay_order_id='order_safe_1',
                razorpay_payment_id='pay_safe_1',
            )

        donation.refresh_from_db()
        assert donation.status == DonationStatus.SUCCESS

    def test_campaign_update_notification_failure_does_not_break_update(self):
        """
        The data node for CampaignUpdate -> donor notifications has the same
        guarantee: the update persists even if delivery raises.
        """
        donor, owner, campaign = self._donation()
        Donation.objects.create(
            donor=donor, campaign=campaign, amount=Decimal('50.00'),
            status=DonationStatus.SUCCESS, razorpay_order_id='order_safe_2',
        )
        from campaigns.models import CampaignUpdate

        with patch.object(
            signals.send_notification_task, 'delay', side_effect=RuntimeError('no broker')
        ):
            update = CampaignUpdate.objects.create(
                campaign=campaign,
                title='Progress!',
                content='We hit a milestone.',
                created_by=owner,
            )

        update.refresh_from_db()
        assert update.title == 'Progress!'