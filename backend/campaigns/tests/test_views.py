"""
API integration tests for campaigns.
"""
from datetime import date, timedelta
from decimal import Decimal
import pytest
from rest_framework.test import APIClient
from rest_framework import status
from campaigns.models import Campaign, CampaignCategory, CampaignStatus
from charities.models import CharityOrganization, VerificationStatus
from users.models import User, Role


@pytest.mark.django_db
class TestCampaignViewSet:
    """Test suite for CampaignViewSet API endpoints."""

    @pytest.fixture
    def api_client(self):
        return APIClient()

    @pytest.fixture
    def verified_charity_user(self):
        user = User.objects.create_user(
            email='charity@example.com',
            password='SecurePassword123!',
            role=Role.CHARITY,
        )
        CharityOrganization.objects.create(
            owner=user,
            name='Good Works Foundation',
            registration_number='GWF-001',
            email='contact@goodworks.org',
            description='Helping communities.',
            verification_status=VerificationStatus.VERIFIED,
        )
        return user

    @pytest.fixture
    def unverified_charity_user(self):
        user = User.objects.create_user(
            email='unverified@example.com',
            password='SecurePassword123!',
            role=Role.CHARITY,
        )
        CharityOrganization.objects.create(
            owner=user,
            name='Pending Charity',
            registration_number='GWF-002',
            email='contact@pending.org',
            description='Pending verification.',
            verification_status=VerificationStatus.PENDING,
        )
        return user

    @pytest.fixture
    def donor_user(self):
        return User.objects.create_user(
            email='donor@example.com',
            password='SecurePassword123!',
            role=Role.DONOR,
        )

    @pytest.fixture
    def active_campaign(self, verified_charity_user):
        # Access the organization directly from the user via the related name
        org = verified_charity_user.charity_organization
        today = date.today()
        return Campaign.objects.create(
            organization=org,
            title='Education For All',
            description='Building schools.',
            category=CampaignCategory.EDUCATION,
            goal_amount=Decimal('10000.00'),
            location='Cityville',
            start_date=today,
            end_date=today + timedelta(days=60),
            status=CampaignStatus.ACTIVE,
        )

    def test_list_campaigns_public(self, api_client, active_campaign):
        url = '/api/v1/campaigns/'
        response = api_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) == 1
        assert response.data['results'][0]['title'] == 'Education For All'

    def test_create_campaign_verified_charity(self, api_client, verified_charity_user):
        api_client.force_authenticate(user=verified_charity_user)
        url = '/api/v1/campaigns/'
        today = date.today()
        payload = {
            'title': 'New Health Clinic',
            'description': 'Building a clinic in the village.',
            'category': 'MEDICAL',
            'goal_amount': '15000.00',
            'location': 'Village X',
            'start_date': str(today),
            'end_date': str(today + timedelta(days=45)),
        }
        response = api_client.post(url, payload, format='json')
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['title'] == 'New Health Clinic'
        assert response.data['status'] == CampaignStatus.ACTIVE
        assert response.data['raised_amount'] == '0.00'

    def test_create_campaign_unverified_charity_forbidden(self, api_client, unverified_charity_user):
        api_client.force_authenticate(user=unverified_charity_user)
        url = '/api/v1/campaigns/'
        today = date.today()
        payload = {
            'title': 'Should Fail',
            'description': 'Unverified.',
            'category': 'EDUCATION',
            'goal_amount': '5000.00',
            'location': 'Nowhere',
            'start_date': str(today),
            'end_date': str(today + timedelta(days=10)),
        }
        response = api_client.post(url, payload, format='json')
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_create_campaign_donor_forbidden(self, api_client, donor_user):
        api_client.force_authenticate(user=donor_user)
        url = '/api/v1/campaigns/'
        today = date.today()
        payload = {
            'title': 'Donor Campaign',
            'description': 'Donors cannot create campaigns.',
            'category': 'FOOD',
            'goal_amount': '1000.00',
            'location': 'City',
            'start_date': str(today),
            'end_date': str(today + timedelta(days=10)),
        }
        response = api_client.post(url, payload, format='json')
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_raised_amount_immutable_via_api(self, api_client, verified_charity_user, active_campaign):
        api_client.force_authenticate(user=verified_charity_user)
        url = f'/api/v1/campaigns/{active_campaign.pk}/'
        payload = {
            'title': 'Updated Title',
            'raised_amount': '500.00',  # Attempt to manipulate raised amount
        }
        response = api_client.patch(url, payload, format='json')
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'raised_amount' in response.data
