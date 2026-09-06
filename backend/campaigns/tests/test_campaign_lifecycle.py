"""
Regression tests for the campaign lifecycle fix.

A verified charity's new campaign must start ACTIVE (publicly discoverable)
instead of DRAFT. DRAFT is not removed as a status: directly-created model
records still default to DRAFT, and owner-managed transitions stay intact.
"""
from datetime import date, timedelta
from decimal import Decimal
import pytest
from rest_framework.test import APIClient
from rest_framework import status
from campaigns.models import Campaign, CampaignCategory, CampaignStatus
from charities.models import CharityOrganization, VerificationStatus
from users.models import User, Role


def _campaign_payload(today, title='Regression Clinic', **overrides):
    payload = {
        'title': title,
        'description': 'Building a clinic in the village.',
        'category': 'MEDICAL',
        'goal_amount': '15000.00',
        'location': 'Village X',
        'start_date': str(today),
        'end_date': str(today + timedelta(days=45)),
    }
    payload.update(overrides)
    return payload


@pytest.mark.django_db
class TestVerifiedCampaignStartsActive:
    """The core fix: verified charities' campaigns go live immediately."""

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

    def test_verified_charity_create_returns_active(self, api_client, verified_charity_user):
        """A verified charity's new campaign starts ACTIVE."""
        api_client.force_authenticate(user=verified_charity_user)
        resp = api_client.post(
            '/api/v1/campaigns/', _campaign_payload(date.today()), format='json'
        )
        assert resp.status_code == status.HTTP_201_CREATED
        assert resp.data['status'] == CampaignStatus.ACTIVE

    def test_verified_charity_campaign_is_publicly_discoverable(
        self, api_client, verified_charity_user
    ):
        """ACTIVE campaign is visible to unauthenticated/discovery users."""
        api_client.force_authenticate(user=verified_charity_user)
        api_client.post(
            '/api/v1/campaigns/', _campaign_payload(date.today()), format='json'
        )
        # Anonymous public landing page
        resp = api_client.get('/api/v1/campaigns/')
        assert resp.status_code == status.HTTP_200_OK
        assert len(resp.data['results']) == 1
        assert resp.data['results'][0]['status'] == CampaignStatus.ACTIVE

    def test_client_supplied_status_is_ignored_on_create(
        self, api_client, verified_charity_user
    ):
        """Status is never client-controllable on create — still ACTIVE."""
        api_client.force_authenticate(user=verified_charity_user)
        resp = api_client.post(
            '/api/v1/campaigns/',
            _campaign_payload(date.today(), status=CampaignStatus.COMPLETED),
            format='json',
        )
        assert resp.status_code == status.HTTP_201_CREATED
        assert resp.data['status'] == CampaignStatus.ACTIVE
        # A DRAFT-aspiring client also gets ACTIVE; status read/write is enforced.
        resp = api_client.post(
            '/api/v1/campaigns/',
            _campaign_payload(date.today(), title='Second', status=CampaignStatus.DRAFT),
            format='json',
        )
        assert resp.status_code == status.HTTP_201_CREATED
        assert resp.data['status'] == CampaignStatus.ACTIVE

    def test_unverified_charity_still_forbidden(
        self, api_client, unverified_charity_user
    ):
        """Verification gate is unchanged: unverified charities cannot create."""
        api_client.force_authenticate(user=unverified_charity_user)
        resp = api_client.post(
            '/api/v1/campaigns/', _campaign_payload(date.today()), format='json'
        )
        assert resp.status_code == status.HTTP_403_FORBIDDEN

    def test_non_charity_still_forbidden(self, api_client, donor_user):
        """Role gate is unchanged: donors cannot create campaigns."""
        api_client.force_authenticate(user=donor_user)
        resp = api_client.post(
            '/api/v1/campaigns/', _campaign_payload(date.today()), format='json'
        )
        assert resp.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
class TestDraftStatusPreserved:
    """DRAFT remains a first-class status; only verified creation skips it."""

    @pytest.fixture
    def api_client(self):
        return APIClient()

    @pytest.fixture
    def verified_charity(self):
        user = User.objects.create_user(
            email='owner@example.com',
            password='SecurePassword123!',
            role=Role.CHARITY,
        )
        return CharityOrganization.objects.create(
            owner=user,
            name='Draft Holder Trust',
            registration_number='DRF-001',
            email='contact@draft.org',
            description='Holds draft campaigns.',
            verification_status=VerificationStatus.VERIFIED,
        )

    def _draft_campaign(self, charity, title='Draft Campaign'):
        today = date.today()
        return Campaign.objects.create(
            organization=charity,
            title=title,
            description='Not yet live.',
            category=CampaignCategory.EDUCATION,
            goal_amount=Decimal('5000.00'),
            location='Draftville',
            start_date=today,
            end_date=today + timedelta(days=30),
            status=CampaignStatus.DRAFT,
        )

    def test_model_default_is_still_draft(self, verified_charity):
        """Direct model creation without a status still defaults to DRAFT."""
        today = date.today()
        campaign = Campaign.objects.create(
            organization=verified_charity,
            title='Implicit Draft',
            description='Created without a status.',
            category=CampaignCategory.EDUCATION,
            goal_amount=Decimal('5000.00'),
            location='Draftville',
            start_date=today,
            end_date=today + timedelta(days=30),
        )
        assert campaign.status == CampaignStatus.DRAFT

    def test_existing_draft_stays_hidden_from_public(self, api_client, verified_charity):
        """Existing DRAFT campaigns remain invisible in public discovery."""
        self._draft_campaign(verified_charity)
        resp = api_client.get('/api/v1/campaigns/')
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data['count'] == 0

    def test_existing_draft_visible_to_owner(self, api_client, verified_charity):
        """The owning charity can still see its own DRAFT campaigns."""
        draft = self._draft_campaign(verified_charity)
        api_client.force_authenticate(user=verified_charity.owner)
        resp = api_client.get(f'/api/v1/campaigns/{draft.pk}/')
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data['status'] == CampaignStatus.DRAFT

    def test_draft_to_active_still_allowed(self, api_client, verified_charity):
        """Owner can still promote an existing DRAFT to ACTIVE via PATCH."""
        draft = self._draft_campaign(verified_charity)
        api_client.force_authenticate(user=verified_charity.owner)
        resp = api_client.patch(
            f'/api/v1/campaigns/{draft.pk}/',
            {'status': CampaignStatus.ACTIVE},
            format='json',
        )
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data['status'] == CampaignStatus.ACTIVE

    def test_active_cannot_transition_back_to_draft(self, api_client, verified_charity):
        """ACTIVE → DRAFT is rejected; lifecycle rules are unchanged."""
        today = date.today()
        active = Campaign.objects.create(
            organization=verified_charity,
            title='Live Campaign',
            description='Actively raising.',
            category=CampaignCategory.FOOD,
            goal_amount=Decimal('10000.00'),
            location='Liveville',
            start_date=today,
            end_date=today + timedelta(days=30),
            status=CampaignStatus.ACTIVE,
        )
        api_client.force_authenticate(user=verified_charity.owner)
        resp = api_client.patch(
            f'/api/v1/campaigns/{active.pk}/',
            {'status': CampaignStatus.DRAFT},
            format='json',
        )
        assert resp.status_code == status.HTTP_400_BAD_REQUEST
        assert 'status' in resp.data