"""
Tests for Volunteer Management domain.
"""
from datetime import date, timedelta
from decimal import Decimal
import pytest
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework import status

from charities.models import CharityOrganization, VerificationStatus
from users.models import User, Role
from volunteers.models import VolunteerOpportunity, VolunteerApplication, OpportunityStatus, ApplicationStatus


@pytest.mark.django_db
class TestVolunteerManagement:
    """Test suite for volunteer opportunities and applications."""

    @pytest.fixture
    def api_client(self):
        return APIClient()

    @pytest.fixture
    def charity_owner(self):
        return User.objects.create_user(
            email='charity_owner_vol@example.com',
            password='SecurePassword123!',
            role=Role.CHARITY,
        )

    @pytest.fixture
    def verified_charity(self, charity_owner):
        return CharityOrganization.objects.create(
            owner=charity_owner,
            name='Volunteer Charity',
            email='volcharity@example.com',
            registration_number='REG-VOL-100',
            description='Charity for volunteering.',
            verification_status=VerificationStatus.VERIFIED,
        )

    @pytest.fixture
    def donor_user(self):
        return User.objects.create_user(
            email='volunteer_donor@example.com',
            password='SecurePassword123!',
            role=Role.DONOR,
        )

    @pytest.fixture
    def sample_opportunity(self, verified_charity):
        return VolunteerOpportunity.objects.create(
            title='Tree Planting',
            charity_organization=verified_charity,
            description='Plant trees in the community.',
            location='Nairobi',
            event_date=timezone.now() + timedelta(days=7),
            slots_available=10,
            status=OpportunityStatus.OPEN,
        )

    def test_charity_owner_can_create_opportunity(self, api_client, charity_owner, verified_charity):
        api_client.force_authenticate(user=charity_owner)
        payload = {
            'title': 'Community Cleanup',
            'charity_organization': verified_charity.id,
            'description': 'Clean the park.',
            'location': 'Kisumu',
            'event_date': (timezone.now() + timedelta(days=7)).isoformat(),
            'slots_available': 5,
        }
        response = api_client.post('/api/v1/volunteers/opportunities/', payload, format='json')
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['title'] == 'Community Cleanup'

    def test_donor_cannot_create_opportunity(self, api_client, donor_user, verified_charity):
        api_client.force_authenticate(user=donor_user)
        payload = {
            'title': 'Illegal Opportunity',
            'charity_organization': verified_charity.id,
            'description': 'Unauthorized.',
            'location': 'Eldoret',
            'event_date': (timezone.now() + timedelta(days=7)).isoformat(),
            'slots_available': 5,
        }
        response = api_client.post('/api/v1/volunteers/opportunities/', payload, format='json')
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_volunteer_can_apply_to_opportunity(self, api_client, donor_user, sample_opportunity):
        api_client.force_authenticate(user=donor_user)
        payload = {
            'opportunity': sample_opportunity.id,
            'statement': 'I want to help plant trees!',
        }
        response = api_client.post('/api/v1/volunteers/applications/', payload, format='json')
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['status'] == ApplicationStatus.PENDING

        # Duplicate application should fail (unique_together constraint)
        response_dup = api_client.post('/api/v1/volunteers/applications/', payload, format='json')
        assert response_dup.status_code == status.HTTP_400_BAD_REQUEST

    def test_charity_owner_can_update_application_status(self, api_client, charity_owner, donor_user, sample_opportunity):
        application = VolunteerApplication.objects.create(
            opportunity=sample_opportunity,
            volunteer=donor_user,
            statement='Ready to volunteer.',
        )

        # Authenticate as charity owner
        api_client.force_authenticate(user=charity_owner)
        url = f'/api/v1/volunteers/applications/{application.pk}/update_status/'
        response = api_client.post(url, {'status': ApplicationStatus.APPROVED}, format='json')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['status'] == ApplicationStatus.APPROVED
