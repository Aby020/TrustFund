"""
API integration tests for campaign image upload (multipart/form-data).
"""
from io import BytesIO
import os
from datetime import date, timedelta

import pytest
from PIL import Image
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework import status
from rest_framework.test import APIClient

from campaigns.models import Campaign, CampaignCategory, CampaignStatus
from charities.models import CharityOrganization, VerificationStatus
from users.models import User, Role


def _make_image(name='campaign.png', fmt='PNG', content_type='image/png',
                size=(120, 80), color='red'):
    """Build an in-memory image file for multipart uploads."""
    buf = BytesIO()
    Image.new('RGB', size, color=color).save(buf, format=fmt)
    buf.seek(0)
    return SimpleUploadedFile(name, buf.read(), content_type=content_type)


def _make_oversized_image():
    """Build a valid image whose encoded size exceeds the 5 MB limit."""
    # Random noise does not compress, so the PNG stays near the raw size.
    width = height = 2000
    raw = Image.frombytes('RGB', (width, height), os.urandom(width * height * 3))
    buf = BytesIO()
    raw.save(buf, format='PNG')
    buf.seek(0)
    return SimpleUploadedFile('big.png', buf.read(), content_type='image/png')


def _campaign_payload(extra=None):
    today = date.today()
    payload = {
        'title': 'New Health Clinic',
        'description': 'Building a clinic in the village.',
        'category': CampaignCategory.MEDICAL,
        'goal_amount': '15000.00',
        'location': 'Village X',
        'start_date': str(today),
        'end_date': str(today + timedelta(days=45)),
    }
    if extra:
        payload.update(extra)
    return payload


@pytest.mark.django_db
class TestCampaignImageUpload:
    """Test suite for campaign image uploads."""

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

    def test_create_campaign_with_image(self, api_client, verified_charity_user):
        """Multipart create with a valid image returns 201 and an image URL."""
        api_client.force_authenticate(user=verified_charity_user)
        payload = _campaign_payload({'image': _make_image()})
        response = api_client.post('/api/v1/campaigns/', payload, format='multipart')

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['status'] == CampaignStatus.ACTIVE
        assert response.data['image'] is not None
        assert response.data['image'].startswith('http')

    def test_create_campaign_without_image(self, api_client, verified_charity_user):
        """Multipart create without an image returns 201 and image null."""
        api_client.force_authenticate(user=verified_charity_user)
        payload = _campaign_payload()
        response = api_client.post('/api/v1/campaigns/', payload, format='multipart')

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['image'] is None

    def test_create_campaign_invalid_image_type(self, api_client, verified_charity_user):
        """A non-image file is rejected with a 400."""
        api_client.force_authenticate(user=verified_charity_user)
        bad = SimpleUploadedFile(
            'notes.txt', b'this is not an image', content_type='text/plain'
        )
        payload = _campaign_payload({'image': bad})
        response = api_client.post('/api/v1/campaigns/', payload, format='multipart')

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'image' in response.data

    def test_create_campaign_oversized_image(self, api_client, verified_charity_user):
        """An image larger than 5 MB is rejected with a 400."""
        api_client.force_authenticate(user=verified_charity_user)
        big = _make_oversized_image()
        assert big.size > 5 * 1024 * 1024
        payload = _campaign_payload({'image': big})
        response = api_client.post('/api/v1/campaigns/', payload, format='multipart')

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'image' in response.data

    def test_serializer_whitelist_rejects_non_image_mime(self):
        """
        The write serializer's MIME whitelist rejects an explicitly non-image
        content_type regardless of the bytes inside (unit-level, independent of
        the test client's multipart encoding, which would otherwise guess from
        the filename).
        """
        from rest_framework import serializers as drf_serializers

        octet = SimpleUploadedFile(
            'photo.bin', _make_image(name='photo.bin').read(), content_type='application/octet-stream'
        )
        from campaigns.serializers import CampaignWriteSerializer
        with pytest.raises(drf_serializers.ValidationError) as excinfo:
            CampaignWriteSerializer().validate_image(octet)
        assert 'JPEG, PNG, GIF' in str(excinfo.value)

    def test_create_campaign_accepts_webp(self, api_client, verified_charity_user):
        """WebP is in the whitelist and is accepted alongside JPEG/PNG/GIF."""
        api_client.force_authenticate(user=verified_charity_user)
        payload = _campaign_payload({'image': _make_image(name='photo.webp', fmt='WEBP',
                                                          content_type='image/webp')})
        response = api_client.post('/api/v1/campaigns/', payload, format='multipart')

        assert response.status_code == status.HTTP_201_CREATED, response.data
        assert response.data['image'] is not None

    def test_create_campaign_sanitizes_upload_filename(self, api_client, verified_charity_user):
        """The stored image name is a UUID; the client filename never reaches storage."""
        api_client.force_authenticate(user=verified_charity_user)
        evil_name = '../../evil.png'
        payload = _campaign_payload({
            'title': 'Traversal Name Edge Case',
            'image': _make_image(name=evil_name),
        })
        response = api_client.post('/api/v1/campaigns/', payload, format='multipart')

        assert response.status_code == status.HTTP_201_CREATED, response.data
        campaign = Campaign.objects.get(title='Traversal Name Edge Case')
        assert campaign.image.name.startswith('campaigns/')
        assert campaign.image.name.endswith('.png')
        assert 'evil' not in campaign.image.name
        assert '/../' not in campaign.image.name

    def _make_campaign(self, user, **kwargs):
        """Create a campaign directly via the ORM (create API omits `id`)."""
        org = user.charity_organization
        today = date.today()
        defaults = {
            'title': 'Base Campaign',
            'description': 'Base description.',
            'category': CampaignCategory.MEDICAL,
            'goal_amount': 15000,
            'location': 'Village X',
            'start_date': today,
            'end_date': today + timedelta(days=45),
            'status': CampaignStatus.DRAFT,
        }
        defaults.update(kwargs)
        return Campaign.objects.create(organization=org, **defaults)

    def test_update_campaign_image(self, api_client, verified_charity_user):
        """An image can be added/updated via multipart PATCH."""
        api_client.force_authenticate(user=verified_charity_user)
        campaign = self._make_campaign(verified_charity_user)
        assert not campaign.image

        response = api_client.patch(
            f'/api/v1/campaigns/{campaign.pk}/',
            {'image': _make_image()},
            format='multipart',
        )
        assert response.status_code == status.HTTP_200_OK
        campaign.refresh_from_db()
        assert campaign.image

    def test_update_campaign_preserves_existing_image(self, api_client, verified_charity_user):
        """A PATCH without an image key leaves the existing image untouched."""
        api_client.force_authenticate(user=verified_charity_user)
        campaign = self._make_campaign(verified_charity_user, image=_make_image())
        original_name = campaign.image.name
        assert original_name

        response = api_client.patch(
            f'/api/v1/campaigns/{campaign.pk}/',
            {'title': 'Renamed Clinic'},
            format='multipart',
        )
        assert response.status_code == status.HTTP_200_OK
        campaign.refresh_from_db()
        assert campaign.image.name == original_name
