"""
Tests for Campaign model.
"""
from datetime import date, timedelta
from decimal import Decimal
import pytest
from django.core.exceptions import ValidationError
from django.db import IntegrityError
from campaigns.models import Campaign, CampaignCategory, CampaignStatus
from charities.models import CharityOrganization, VerificationStatus
from users.models import User, Role


@pytest.mark.django_db
class TestCampaignModel:
    """Test suite for Campaign model rules and constraints."""

    @pytest.fixture
    def verified_charity(self):
        owner = User.objects.create_user(
            email='charityowner@example.com',
            password='SecurePassword123!',
            role=Role.CHARITY,
        )
        return CharityOrganization.objects.create(
            owner=owner,
            name='Help the World Foundation',
            email='charity@example.com',
            registration_number='REG-12345',
            description='Provide aid worldwide.',
            verification_status=VerificationStatus.VERIFIED,
        )

    def test_create_valid_campaign(self, verified_charity):
        today = date.today()
        campaign = Campaign.objects.create(
            organization=verified_charity,
            title='Clean Water Initiative',
            description='Drilling wells in rural areas.',
            category=CampaignCategory.COMMUNITY,
            goal_amount=Decimal('5000.00'),
            location='Nairobi',
            start_date=today,
            end_date=today + timedelta(days=30),
            status=CampaignStatus.DRAFT,
        )
        assert campaign.pk is not None
        assert campaign.status == CampaignStatus.DRAFT
        assert campaign.raised_amount == Decimal('0.00')

    def test_campaign_date_validation(self, verified_charity):
        today = date.today()
        campaign = Campaign(
            organization=verified_charity,
            title='Invalid Dates',
            description='Test invalid date range.',
            category=CampaignCategory.EDUCATION,
            goal_amount=Decimal('1000.00'),
            location='Local',
            start_date=today + timedelta(days=10),
            end_date=today,  # End before start
        )
        with pytest.raises(ValidationError) as excinfo:
            campaign.full_clean()
        assert 'end_date' in excinfo.value.error_dict

    def test_campaign_goal_amount_validation(self, verified_charity):
        today = date.today()
        campaign = Campaign(
            organization=verified_charity,
            title='Zero Goal',
            description='Test zero goal.',
            category=CampaignCategory.MEDICAL,
            goal_amount=Decimal('0.00'),
            location='Local',
            start_date=today,
            end_date=today + timedelta(days=10),
        )
        with pytest.raises(ValidationError) as excinfo:
            campaign.full_clean()
        assert 'goal_amount' in excinfo.value.error_dict

    def test_valid_status_transitions(self, verified_charity):
        today = date.today()
        campaign = Campaign.objects.create(
            organization=verified_charity,
            title='Transition Test',
            description='Testing transitions.',
            category=CampaignCategory.FOOD,
            goal_amount=Decimal('1000.00'),
            location='Local',
            start_date=today,
            end_date=today + timedelta(days=10),
            status=CampaignStatus.DRAFT,
        )
        # DRAFT -> ACTIVE is valid
        campaign.status = CampaignStatus.ACTIVE
        campaign.full_clean()
        campaign.save()
        assert campaign.status == CampaignStatus.ACTIVE

        # ACTIVE -> COMPLETED is valid
        campaign.status = CampaignStatus.COMPLETED
        campaign.full_clean()
        campaign.save()
        assert campaign.status == CampaignStatus.COMPLETED

        # COMPLETED -> ACTIVE is invalid
        campaign.status = CampaignStatus.ACTIVE
        with pytest.raises(ValidationError) as excinfo:
            campaign.full_clean()
        assert 'status' in excinfo.value.error_dict
