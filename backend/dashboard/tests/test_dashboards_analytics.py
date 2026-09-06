"""
Tests for dashboards and analytics endpoints (Task 12).
"""
import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model
from decimal import Decimal

from campaigns.models import Campaign, CampaignStatus, CampaignCategory
from charities.models import CharityOrganization, VerificationStatus
from donations.models import Donation, DonationStatus
from receipts.models import Receipt

User = get_user_model()


@pytest.mark.django_db
class TestDashboardsAndAnalytics:
    """Test suite for Task 12: Dashboards and Analytics."""

    @pytest.fixture(autouse=True)
    def setup_data(self):
        # Create users
        self.donor = User.objects.create_user(
            email='donor@example.com',
            password='Password123!',
            role='DONOR',
            first_name='John',
            last_name='Donor',
        )

        self.owner = User.objects.create_user(
            email='owner@example.com',
            password='Password123!',
            role='CHARITY',
            first_name='Jane',
            last_name='Owner',
        )

        self.admin = User.objects.create_user(
            email='admin@example.com',
            password='Password123!',
            role='ADMIN',
            is_staff=True,
            is_superuser=True,
            first_name='Super',
            last_name='Admin',
        )

        # Create charity
        self.charity = CharityOrganization.objects.create(
            owner=self.owner,
            name='Help Wildlife',
            registration_number='WILD123',
            description='Protecting wildlife.',
            email='contact@wildlife.org',
            verification_status=VerificationStatus.VERIFIED,
        )

        # Create campaign
        self.campaign = Campaign.objects.create(
            organization=self.charity,
            title='Save the Tigers',
            description='Fundraising for tiger habitats.',
            category=CampaignCategory.ENVIRONMENT,
            goal_amount=10000.00,
            raised_amount=5000.00,
            location='India',
            start_date='2026-01-01',
            end_date='2026-12-31',
            status=CampaignStatus.ACTIVE,
        )

        # Create successful donation
        self.donation = Donation.objects.create(
            campaign=self.campaign,
            donor=self.donor,
            amount=Decimal('5000.00'),
            currency='INR',
            status=DonationStatus.SUCCESS,
            razorpay_order_id='order_123',
            razorpay_payment_id='pay_123',
        )

        # Receipt is auto-created by the receipts/signals.py post_save signal
        # when a donation status is SUCCESS, so no explicit creation needed.

        self.client = APIClient()

    def test_donor_dashboard(self):
        """Donor can view personal dashboard metrics and recent donations."""
        self.client.force_authenticate(user=self.donor)
        url = reverse('donor-dashboard')
        response = self.client.get(url)

        assert response.status_code == status.HTTP_200_OK
        data = response.data
        assert data['total_donated'] == '5000.00'
        assert data['donation_count'] == 1
        assert data['campaigns_supported'] == 1
        assert data['total_receipts'] == 1
        assert len(data['recent_donations']) == 1

    def test_charity_dashboard(self):
        """Charity owner can view organization summary and raised funds."""
        self.client.force_authenticate(user=self.owner)
        url = reverse('charity-dashboard')
        response = self.client.get(url)

        assert response.status_code == status.HTTP_200_OK
        data = response.data
        assert data['organization']['name'] == 'Help Wildlife'
        assert data['campaigns_count'] == 1
        assert data['active_campaigns_count'] == 1
        assert data['total_raised'] == '5000.00'
        assert len(data['recent_donations']) == 1

    def test_charity_dashboard_forbidden_for_non_owner(self):
        """Non-charity owners or users without charity cannot access charity dashboard."""
        self.client.force_authenticate(user=self.donor)
        url = reverse('charity-dashboard')
        response = self.client.get(url)
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_charity_dashboard_no_org_returns_empty(self):
        """Charity user without an organization gets 200 with null org and zeroed stats."""
        charity_no_org = User.objects.create_user(
            email='newcharity@example.com',
            password='Password123!',
            role='CHARITY',
            first_name='New',
            last_name='Charity',
        )
        self.client.force_authenticate(user=charity_no_org)
        url = reverse('charity-dashboard')
        response = self.client.get(url)

        assert response.status_code == status.HTTP_200_OK
        data = response.data
        assert data['organization'] is None
        assert data['campaigns_count'] == 0
        assert data['active_campaigns_count'] == 0
        assert data['total_raised'] == '0.00'
        assert data['recent_donations'] == []

    def test_charity_dashboard_forbidden_for_volunteer(self):
        """Volunteer users cannot access charity dashboard."""
        volunteer = User.objects.create_user(
            email='volunteer@example.com',
            password='Password123!',
            role='VOLUNTEER',
            first_name='Vol',
            last_name='unteer',
        )
        self.client.force_authenticate(user=volunteer)
        url = reverse('charity-dashboard')
        response = self.client.get(url)
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_charity_dashboard_forbidden_for_admin(self):
        """Admin users cannot access charity dashboard (not a charity role)."""
        self.client.force_authenticate(user=self.admin)
        url = reverse('charity-dashboard')
        response = self.client.get(url)
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_charity_dashboard_unauthenticated(self):
        """Unauthenticated requests to charity dashboard return 401."""
        url = reverse('charity-dashboard')
        response = self.client.get(url)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_admin_dashboard(self):
        """System admin can view system-wide stats."""
        self.client.force_authenticate(user=self.admin)
        url = reverse('admin-dashboard')
        response = self.client.get(url)

        assert response.status_code == status.HTTP_200_OK
        data = response.data
        assert data['total_users'] == 3
        assert data['total_charities'] == 1
        assert data['verified_charities'] == 1
        assert data['total_campaigns'] == 1
        assert data['active_campaigns'] == 1
        assert data['total_raised'] == '5000.00'

    def test_admin_dashboard_forbidden_for_regular_user(self):
        """Regular users cannot access admin dashboard."""
        self.client.force_authenticate(user=self.donor)
        url = reverse('admin-dashboard')
        response = self.client.get(url)
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_analytics_endpoint(self):
        """Analytics endpoint (admin-only) returns categorical breakdown and success rate."""
        self.client.force_authenticate(user=self.admin)
        url = reverse('analytics')
        response = self.client.get(url)

        assert response.status_code == status.HTTP_200_OK
        data = response.data
        assert 'donations_by_category' in data
        assert len(data['donations_by_category']) == 1
        assert data['donations_by_category'][0]['category'] == CampaignCategory.ENVIRONMENT
        assert data['donations_by_category'][0]['total_amount'] == '5000.00'
        assert data['total_campaigns'] == 1
        assert data['successful_campaigns'] == 0  # raised 5000 < goal 10000
        assert data['success_rate_percentage'] == 0.0

    def test_analytics_forbidden_for_non_admin(self):
        """Aggregate analytics are admin-only; a donor gets 403."""
        self.client.force_authenticate(user=self.donor)
        url = reverse('analytics')
        response = self.client.get(url)
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_analytics_unauthenticated(self):
        """Aggregate analytics are admin-only; anonymous requests get 401."""
        url = reverse('analytics')
        response = self.client.get(url)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
