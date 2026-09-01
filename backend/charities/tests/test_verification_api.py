"""
Tests for Charity Organization verification workflow API endpoints.

Covers:
- Submission
- Admin approval
- Admin rejection
- Rejection reason validation
- Invalid state transitions
- Authorization checks
"""
import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from users.models import Role, User
from charities.models import CharityOrganization, VerificationStatus, VerificationAction, VerificationLog


@pytest.mark.django_db
class TestVerificationAPI:
    """Tests for verification workflow API endpoints."""

    def setup_method(self):
        self.client = APIClient()
        self.charity_user = User.objects.create_user(
            email='charity@example.com',
            password='SecurePass123!',
            first_name='Charity',
            last_name='User',
            role=Role.CHARITY,
        )
        self.admin_user = User.objects.create_user(
            email='admin@example.com',
            password='SecurePass123!',
            first_name='Admin',
            last_name='User',
            role=Role.ADMIN,
        )
        self.donor_user = User.objects.create_user(
            email='donor@example.com',
            password='SecurePass123!',
            first_name='Donor',
            last_name='User',
            role=Role.DONOR,
        )
        self.org = CharityOrganization.objects.create(
            owner=self.charity_user,
            name='Helping Hands Foundation',
            email='contact@helpinghands.org',
            registration_number='CH-12345678',
        )

    def test_submit_verification_success(self):
        """Test charity owner can submit organization for verification."""
        self.client.force_authenticate(user=self.charity_user)
        url = reverse('charity-submit', kwargs={'pk': self.org.pk})
        response = self.client.post(url, format='json')

        assert response.status_code == status.HTTP_200_OK
        self.org.refresh_from_db()
        assert self.org.is_pending
        assert self.org.submitted_at is not None

    def test_approve_verification_success(self):
        """Test admin can approve verification."""
        self.org.submit_for_verification(self.charity_user)
        self.client.force_authenticate(user=self.admin_user)
        url = reverse('charity-approve', kwargs={'pk': self.org.pk})
        response = self.client.post(url, format='json')

        assert response.status_code == status.HTTP_200_OK
        self.org.refresh_from_db()
        assert self.org.is_verified
        assert self.org.reviewed_by == self.admin_user
        assert self.org.reviewed_at is not None
        assert self.org.verified_at is not None

    def test_reject_verification_success(self):
        """Test admin can reject verification."""
        self.org.submit_for_verification(self.charity_user)
        self.client.force_authenticate(user=self.admin_user)
        url = reverse('charity-reject', kwargs={'pk': self.org.pk})
        data = {'rejection_reason': 'Insufficient documentation provided.'}
        response = self.client.post(url, data, format='json')

        assert response.status_code == status.HTTP_200_OK
        self.org.refresh_from_db()
        assert self.org.is_rejected
        assert self.org.rejection_reason == 'Insufficient documentation provided.'
        assert self.org.reviewed_by == self.admin_user

    def test_reject_verification_missing_reason(self):
        """Test rejection fails without reason."""
        self.org.submit_for_verification(self.charity_user)
        self.client.force_authenticate(user=self.admin_user)
        url = reverse('charity-reject', kwargs={'pk': self.org.pk})
        response = self.client.post(url, {}, format='json')

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_charity_cannot_approve_self(self):
        """Test charity user cannot approve their own verification."""
        self.org.submit_for_verification(self.charity_user)
        self.client.force_authenticate(user=self.charity_user)
        url = reverse('charity-approve', kwargs={'pk': self.org.pk})
        response = self.client.post(url, format='json')

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_donor_cannot_submit_verification(self):
        """Test donor cannot submit verification."""
        self.client.force_authenticate(user=self.donor_user)
        url = reverse('charity-submit', kwargs={'pk': self.org.pk})
        response = self.client.post(url, format='json')

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_invalid_state_transition(self):
        """Test cannot approve already verified organization."""
        self.org.verification_status = VerificationStatus.VERIFIED
        self.org.save()
        self.client.force_authenticate(user=self.admin_user)
        url = reverse('charity-approve', kwargs={'pk': self.org.pk})
        response = self.client.post(url, format='json')

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_verification_history_log(self):
        """Test verification log is generated."""
        # Submit via API to generate SUBMIT log
        self.client.force_authenticate(user=self.charity_user)
        url_submit = reverse('charity-submit', kwargs={'pk': self.org.pk})
        self.client.post(url_submit, format='json')

        # Approve via API to generate APPROVE log
        self.client.force_authenticate(user=self.admin_user)
        url_approve = reverse('charity-approve', kwargs={'pk': self.org.pk})
        self.client.post(url_approve, format='json')

        # Fetch history
        url_history = reverse('charity-history', kwargs={'pk': self.org.pk})
        self.client.force_authenticate(user=self.charity_user)
        response = self.client.get(url_history)

        assert response.status_code == status.HTTP_200_OK
        # Should have at least SUBMIT and APPROVE logs
        assert len(response.data) >= 2
        # Latest log should be APPROVE (ordering is -created_at)
        assert response.data[0]['action'] == VerificationAction.APPROVE