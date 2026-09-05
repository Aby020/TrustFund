"""
Tests for Volunteer Management domain.

Covers:
- Opportunity CRUD permissions
- Application creation role enforcement (VOLUNTEER only)
- Application ownership isolation
- Charity/admin application management
- Unauthenticated access rejection
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
    def volunteer_user(self):
        return User.objects.create_user(
            email='volunteer_user@example.com',
            password='SecurePassword123!',
            role=Role.VOLUNTEER,
        )

    @pytest.fixture
    def admin_user(self):
        return User.objects.create_user(
            email='volunteer_admin@example.com',
            password='SecurePassword123!',
            role=Role.ADMIN,
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

    # ---- Opportunity permissions ----

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

    def test_unauthenticated_cannot_create_opportunity(self, api_client, verified_charity):
        payload = {
            'title': 'Anonymous Opportunity',
            'charity_organization': verified_charity.id,
            'description': 'No auth.',
            'location': 'Nairobi',
            'event_date': (timezone.now() + timedelta(days=7)).isoformat(),
            'slots_available': 3,
        }
        response = api_client.post('/api/v1/volunteers/opportunities/', payload, format='json')
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    # ---- Application role enforcement ----

    def test_volunteer_can_apply_to_opportunity(self, api_client, volunteer_user, sample_opportunity):
        """VOLUNTEER role can create their own application."""
        api_client.force_authenticate(user=volunteer_user)
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

    def test_donor_cannot_create_application(self, api_client, donor_user, sample_opportunity):
        """DONOR role must NOT be able to create volunteer applications."""
        api_client.force_authenticate(user=donor_user)
        payload = {
            'opportunity': sample_opportunity.id,
            'statement': 'I want to volunteer!',
        }
        response = api_client.post('/api/v1/volunteers/applications/', payload, format='json')
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_charity_cannot_create_application(self, api_client, charity_owner, sample_opportunity):
        """CHARITY role must NOT be able to create volunteer applications."""
        api_client.force_authenticate(user=charity_owner)
        payload = {
            'opportunity': sample_opportunity.id,
            'statement': 'I want to volunteer!',
        }
        response = api_client.post('/api/v1/volunteers/applications/', payload, format='json')
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_unauthenticated_cannot_create_application(self, api_client, sample_opportunity):
        """Unauthenticated users must get 401 on application creation."""
        payload = {
            'opportunity': sample_opportunity.id,
            'statement': 'Anonymous volunteer.',
        }
        response = api_client.post('/api/v1/volunteers/applications/', payload, format='json')
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_volunteer_cannot_apply_for_another_user(self, api_client, volunteer_user, sample_opportunity):
        """Volunteer applications always use the authenticated user as volunteer."""
        other_volunteer = User.objects.create_user(
            email='other_volunteer@example.com',
            password='SecurePassword123!',
            role=Role.VOLUNTEER,
        )
        api_client.force_authenticate(user=volunteer_user)
        payload = {
            'opportunity': sample_opportunity.id,
            'volunteer': other_volunteer.id,  # attempt to impersonate
            'statement': 'Apply for someone else.',
        }
        response = api_client.post('/api/v1/volunteers/applications/', payload, format='json')
        assert response.status_code == status.HTTP_201_CREATED
        # The volunteer field should be overridden to the authenticated user
        application = VolunteerApplication.objects.get(pk=response.data['id'])
        assert application.volunteer == volunteer_user

    # ---- Application ownership isolation ----

    def test_volunteer_sees_only_own_applications(self, api_client, volunteer_user, donor_user, sample_opportunity):
        """Volunteer can only list their own applications."""
        app1 = VolunteerApplication.objects.create(
            opportunity=sample_opportunity, volunteer=volunteer_user, statement='My app.',
        )
        app2 = VolunteerApplication.objects.create(
            opportunity=sample_opportunity, volunteer=donor_user, statement='Other app.',
        )

        api_client.force_authenticate(user=volunteer_user)
        response = api_client.get('/api/v1/volunteers/applications/')
        assert response.status_code == status.HTTP_200_OK
        results = response.data['results'] if 'results' in response.data else response.data
        assert len(results) == 1
        assert results[0]['id'] == app1.id

    def test_volunteer_cannot_access_other_application(self, api_client, volunteer_user, sample_opportunity):
        """Volunteer cannot retrieve another user's application."""
        other_volunteer = User.objects.create_user(
            email='other_v@example.com',
            password='SecurePassword123!',
            role=Role.VOLUNTEER,
        )
        app = VolunteerApplication.objects.create(
            opportunity=sample_opportunity, volunteer=other_volunteer, statement='Not mine.',
        )

        api_client.force_authenticate(user=volunteer_user)
        response = api_client.get(f'/api/v1/volunteers/applications/{app.pk}/')
        assert response.status_code == status.HTTP_404_NOT_FOUND

    # ---- Charity/admin application management ----

    def test_charity_owner_can_update_application_status(self, api_client, charity_owner, volunteer_user, sample_opportunity):
        application = VolunteerApplication.objects.create(
            opportunity=sample_opportunity,
            volunteer=volunteer_user,
            statement='Ready to volunteer.',
        )

        api_client.force_authenticate(user=charity_owner)
        url = f'/api/v1/volunteers/applications/{application.pk}/update_status/'
        response = api_client.post(url, {'status': ApplicationStatus.APPROVED}, format='json')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['status'] == ApplicationStatus.APPROVED

    def test_admin_can_manage_applications(self, api_client, admin_user, volunteer_user, sample_opportunity):
        """ADMIN can view and manage all applications."""
        application = VolunteerApplication.objects.create(
            opportunity=sample_opportunity,
            volunteer=volunteer_user,
            statement='Admin review.',
        )

        api_client.force_authenticate(user=admin_user)
        # Admin can list all applications
        response = api_client.get('/api/v1/volunteers/applications/')
        assert response.status_code == status.HTTP_200_OK
        results = response.data['results'] if 'results' in response.data else response.data
        assert len(results) == 1

        # Admin can update status
        url = f'/api/v1/volunteers/applications/{application.pk}/update_status/'
        response = api_client.post(url, {'status': ApplicationStatus.APPROVED}, format='json')
        assert response.status_code == status.HTTP_200_OK

    def test_donor_cannot_list_applications(self, api_client, donor_user, volunteer_user, sample_opportunity):
        """DONOR cannot list volunteer applications."""
        VolunteerApplication.objects.create(
            opportunity=sample_opportunity,
            volunteer=volunteer_user,
            statement='Test.',
        )

        api_client.force_authenticate(user=donor_user)
        response = api_client.get('/api/v1/volunteers/applications/')
        assert response.status_code == status.HTTP_403_FORBIDDEN
