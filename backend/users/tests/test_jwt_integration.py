"""
Integration tests for JWT authentication across protected endpoints.

Verifies that:
- Authenticated DONOR can access donor-specific endpoints via Authorization header.
- Unauthenticated requests are rejected (401).
- Users with wrong roles are rejected (403).
"""

import pytest
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from users.models import Role, User


@pytest.mark.django_db
class TestDonorEndpointJWTIntegration:
    """Integration tests for donor-specific endpoints using real JWT tokens."""

    def setup_method(self):
        self.client = APIClient()
        self.donor = User.objects.create_user(
            email='jwt-donor@example.com',
            password='SecurePass123!',
            first_name='JWT',
            last_name='Donor',
            role=Role.DONOR,
        )
        self.charity = User.objects.create_user(
            email='jwt-charity@example.com',
            password='SecurePass123!',
            first_name='JWT',
            last_name='Charity',
            role=Role.CHARITY,
        )
        self.donor_token = str(RefreshToken.for_user(self.donor).access_token)
        self.charity_token = str(RefreshToken.for_user(self.charity).access_token)

    def test_donor_dashboard_access(self):
        """Donor can access dashboard with JWT."""
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.donor_token}')
        response = self.client.get('/api/v1/dashboard/donor/')
        assert response.status_code == 200

    def test_donor_dashboard_unauthenticated(self):
        """Unauthenticated request to donor dashboard is rejected."""
        response = self.client.get('/api/v1/dashboard/donor/')
        assert response.status_code == 401

    def test_donor_dashboard_wrong_role(self):
        """Charity user cannot access donor dashboard."""
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.charity_token}')
        response = self.client.get('/api/v1/dashboard/donor/')
        assert response.status_code == 403

    def test_notifications_access(self):
        """Donor can access notifications with JWT."""
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.donor_token}')
        response = self.client.get('/api/v1/notifications/')
        assert response.status_code == 200

    def test_notifications_unauthenticated(self):
        """Unauthenticated request to notifications is rejected."""
        response = self.client.get('/api/v1/notifications/')
        assert response.status_code == 401

    def test_donations_access(self):
        """Donor can access donations list with JWT."""
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.donor_token}')
        response = self.client.get('/api/v1/donations/')
        assert response.status_code == 200

    def test_donations_unauthenticated(self):
        """Unauthenticated request to donations is rejected."""
        response = self.client.get('/api/v1/donations/')
        assert response.status_code == 401

    def test_receipts_access(self):
        """Donor can access receipts list with JWT."""
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.donor_token}')
        response = self.client.get('/api/v1/receipts/')
        assert response.status_code == 200

    def test_receipts_unauthenticated(self):
        """Unauthenticated request to receipts is rejected."""
        response = self.client.get('/api/v1/receipts/')
        assert response.status_code == 401
