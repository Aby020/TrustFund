"""
Tests for campaign updates and notifications.
"""
import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model

from campaigns.models import Campaign, CampaignStatus, CampaignCategory, CampaignUpdate
from charities.models import CharityOrganization, VerificationStatus
from notifications.models import Notification, NotificationType

User = get_user_model()


@pytest.mark.django_db
class TestCampaignUpdatesAndNotifications:
    """Test suite for Task 11: Campaign Updates and Notifications."""

    @pytest.fixture(autouse=True)
    def setup_data(self):
        # Create charity owner user
        self.owner = User.objects.create_user(
            email='charityowner@example.com',
            password='Password123!',
            role='CHARITY',
            first_name='Charity',
            last_name='Owner',
        )
        # Create verified charity
        self.charity = CharityOrganization.objects.create(
            owner=self.owner,
            name='Green Earth Foundation',
            registration_number='REG12345',
            description='Working for a greener earth.',
            email='contact@greenearth.org',
            verification_status=VerificationStatus.VERIFIED,
        )
        # Create active campaign
        self.campaign = Campaign.objects.create(
            organization=self.charity,
            title='Plant 10,000 Trees',
            description='Help us plant trees in the valley.',
            category=CampaignCategory.ENVIRONMENT,
            goal_amount=50000.00,
            location='California',
            start_date='2026-01-01',
            end_date='2026-12-31',
            status=CampaignStatus.ACTIVE,
        )

        # Create donor user
        self.donor = User.objects.create_user(
            email='donor@example.com',
            password='Password123!',
            role='DONOR',
            first_name='Generous',
            last_name='Donor',
        )

        self.client = APIClient()

    def test_campaign_update_creation_by_owner(self):
        """Verified charity owner can create a campaign update."""
        self.client.force_authenticate(user=self.owner)
        url = reverse('campaign-updates-list')
        data = {
            'campaign': self.campaign.id,
            'title': 'First Milestone Reached!',
            'content': 'We have successfully planted 2,000 trees thanks to amazing donors.',
        }
        response = self.client.post(url, data, format='json')
        assert response.status_code == status.HTTP_201_CREATED
        assert CampaignUpdate.objects.filter(campaign=self.campaign).count() == 1

        update_obj = CampaignUpdate.objects.get()
        assert update_obj.title == 'First Milestone Reached!'
        assert update_obj.created_by == self.owner

    def test_campaign_update_creation_forbidden_for_donor(self):
        """Donors cannot create campaign updates."""
        self.client.force_authenticate(user=self.donor)
        url = reverse('campaign-updates-list')
        data = {
            'campaign': self.campaign.id,
            'title': 'Unauthorized Update',
            'content': 'Trying to post an update.',
        }
        response = self.client.post(url, data, format='json')
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_notification_creation_and_retrieval(self):
        """Users can view and manage their own notifications."""
        # Create notification directly
        notif = Notification.create_notification(
            recipient=self.donor,
            notification_type=NotificationType.CAMPAIGN_UPDATE,
            title='New Update Available',
            message='Check out the latest update on Plant 10,000 Trees.',
        )

        self.client.force_authenticate(user=self.donor)
        url = reverse('notification-list')
        response = self.client.get(url)
        assert response.status_code == status.HTTP_200_OK
        results = response.data['results'] if isinstance(response.data, dict) and 'results' in response.data else response.data
        assert len(results) == 1

        # Mark notification as read
        mark_read_url = reverse('notification-mark-read', kwargs={'pk': notif.id})
        response = self.client.post(mark_read_url)
        assert response.status_code == status.HTTP_200_OK
        notif.refresh_from_db()
        assert notif.is_read is True

    def test_notification_recipient_isolation(self):
        """Users cannot view or modify other users' notifications."""
        notif = Notification.create_notification(
            recipient=self.owner,
            notification_type=NotificationType.DONATION_SUCCESSFUL,
            title='Donation Received',
            message='You received a donation.',
        )

        # Authenticate as donor and try to access owner's notification
        self.client.force_authenticate(user=self.donor)
        url = reverse('notification-detail', kwargs={'pk': notif.id})
        response = self.client.get(url)
        assert response.status_code == status.HTTP_404_NOT_FOUND
