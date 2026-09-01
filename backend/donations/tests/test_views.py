"""
Tests for Donation domain and Razorpay payment integration.
"""
from datetime import date, timedelta
from decimal import Decimal
from unittest.mock import patch, MagicMock
import pytest
from rest_framework.test import APIClient
from rest_framework import status

from campaigns.models import Campaign, CampaignCategory, CampaignStatus
from charities.models import CharityOrganization, VerificationStatus
from users.models import User, Role
from donations.models import Donation, DonationStatus


@pytest.mark.django_db
class TestDonationViewSet:
    """Test suite for donation endpoints and Razorpay integration."""

    @pytest.fixture
    def api_client(self):
        return APIClient()

    @pytest.fixture
    def donor_user(self):
        return User.objects.create_user(
            email='donor@example.com',
            password='SecurePassword123!',
            role=Role.DONOR,
        )

    @pytest.fixture
    def other_donor_user(self):
        return User.objects.create_user(
            email='otherdonor@example.com',
            password='SecurePassword123!',
            role=Role.DONOR,
        )

    @pytest.fixture
    def verified_charity(self):
        owner = User.objects.create_user(
            email='charityowner@example.com',
            password='SecurePassword123!',
            role=Role.CHARITY,
        )
        return CharityOrganization.objects.create(
            owner=owner,
            name='Help Foundation',
            email='help@example.com',
            registration_number='REG-999',
            description='Charity work.',
            verification_status=VerificationStatus.VERIFIED,
        )

    @pytest.fixture
    def active_campaign(self, verified_charity):
        today = date.today()
        return Campaign.objects.create(
            organization=verified_charity,
            title='Clean Water Fund',
            description='Providing clean water.',
            category=CampaignCategory.COMMUNITY,
            goal_amount=Decimal('10000.00'),
            location='Nairobi',
            start_date=today,
            end_date=today + timedelta(days=30),
            status=CampaignStatus.ACTIVE,
        )

    @patch('donations.services.RazorpayService.get_client')
    def test_initiate_donation_success(self, mock_get_client, api_client, donor_user, active_campaign):
        mock_client_instance = MagicMock()
        mock_client_instance.order.create.return_value = {
            'id': 'order_test_12345',
            'amount': 100000,
            'currency': 'INR',
            'receipt': 'rcpt_test',
        }
        mock_get_client.return_value = mock_client_instance

        api_client.force_authenticate(user=donor_user)
        url = '/api/v1/donations/'
        payload = {
            'campaign': active_campaign.pk,
            'amount': '1000.00',
            'currency': 'INR',
            'is_anonymous': False,
            'message': 'Keep up the great work!',
            'idempotency_key': 'key_abc_123',
        }
        response = api_client.post(url, payload, format='json')
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['razorpay_order_id'] == 'order_test_12345'
        assert response.data['status'] == DonationStatus.PENDING
        assert response.data['amount'] == '1000.00'

        donation = Donation.objects.get(pk=response.data['id'])
        assert donation.donor == donor_user
        assert donation.campaign == active_campaign
        assert donation.idempotency_key == 'key_abc_123'

    @patch('donations.services.RazorpayService.get_client')
    def test_initiate_donation_idempotency(self, mock_get_client, api_client, donor_user, active_campaign):
        mock_client_instance = MagicMock()
        mock_client_instance.order.create.return_value = {
            'id': 'order_test_idempotent',
            'amount': 50000,
            'currency': 'INR',
        }
        mock_get_client.return_value = mock_client_instance

        api_client.force_authenticate(user=donor_user)
        url = '/api/v1/donations/'
        payload = {
            'campaign': active_campaign.pk,
            'amount': '500.00',
            'idempotency_key': 'same_key_999',
        }
        # First request
        resp1 = api_client.post(url, payload, format='json')
        assert resp1.status_code == status.HTTP_201_CREATED

        # Second request with same idempotency key
        resp2 = api_client.post(url, payload, format='json')
        assert resp2.status_code == status.HTTP_201_CREATED
        assert resp1.data['id'] == resp2.data['id']
        assert Donation.objects.filter(idempotency_key='same_key_999').count() == 1

    @patch('donations.services.RazorpayService.get_client')
    def test_verify_payment_success(self, mock_get_client, api_client, donor_user, active_campaign):
        mock_client_instance = MagicMock()
        mock_client_instance.order.create.return_value = {
            'id': 'order_verify_test',
            'amount': 200000,
            'currency': 'INR',
        }
        mock_client_instance.utility.verify_payment_signature.return_value = True
        mock_get_client.return_value = mock_client_instance

        # Create pending donation
        donation = Donation.objects.create(
            donor=donor_user,
            campaign=active_campaign,
            amount=Decimal('2000.00'),
            status=DonationStatus.PENDING,
            razorpay_order_id='order_verify_test',
        )

        api_client.force_authenticate(user=donor_user)
        url = f'/api/v1/donations/{donation.pk}/verify_payment/'
        payload = {
            'razorpay_payment_id': 'pay_test_98765',
            'razorpay_signature': 'valid_sig_abc',
        }
        response = api_client.post(url, payload, format='json')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['status'] == DonationStatus.SUCCESS
        assert response.data['razorpay_payment_id'] == 'pay_test_98765'

        # Check campaign raised amount updated
        active_campaign.refresh_from_db()
        assert active_campaign.raised_amount == Decimal('2000.00')

    @patch('donations.services.RazorpayService.get_client')
    def test_webhook_processing(self, mock_get_client, api_client, donor_user, active_campaign):
        mock_client_instance = MagicMock()
        mock_client_instance.utility.verify_webhook_signature.return_value = True
        mock_get_client.return_value = mock_client_instance

        donation = Donation.objects.create(
            donor=donor_user,
            campaign=active_campaign,
            amount=Decimal('1500.00'),
            status=DonationStatus.PENDING,
            razorpay_order_id='order_webhook_123',
        )

        url = '/api/v1/donations/webhook/'
        webhook_payload = {
            'event': 'payment.captured',
            'payload': {
                'payment': {
                    'entity': {
                        'id': 'pay_webhook_999',
                        'order_id': 'order_webhook_123',
                    }
                }
            }
        }
        response = api_client.post(url, webhook_payload, format='json', HTTP_X_RAZORPAY_SIGNATURE='valid_webhook_sig')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['status'] == 'success'

        donation.refresh_from_db()
        assert donation.status == DonationStatus.SUCCESS
        assert donation.razorpay_payment_id == 'pay_webhook_999'

        active_campaign.refresh_from_db()
        assert active_campaign.raised_amount == Decimal('1500.00')

    def test_donation_isolation(self, api_client, donor_user, other_donor_user, active_campaign):
        donation1 = Donation.objects.create(
            donor=donor_user,
            campaign=active_campaign,
            amount=Decimal('100.00'),
            status=DonationStatus.SUCCESS,
        )
        donation2 = Donation.objects.create(
            donor=other_donor_user,
            campaign=active_campaign,
            amount=Decimal('200.00'),
            status=DonationStatus.SUCCESS,
        )

        # donor_user lists donations -> should only see donation1
        api_client.force_authenticate(user=donor_user)
        response = api_client.get('/api/v1/donations/')
        assert response.status_code == status.HTTP_200_OK
        results = response.data['results'] if 'results' in response.data else response.data
        assert len(results) == 1
        assert results[0]['id'] == donation1.id
