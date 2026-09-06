"""Tests for the Render health-check endpoint."""

from django.test import SimpleTestCase


class HealthCheckTests(SimpleTestCase):
    def test_healthz_returns_ok(self):
        """The probe is unauthenticated, DB-free, and reports ok."""
        response = self.client.get('/healthz/')
        assert response.status_code == 200
        assert response.json() == {'status': 'ok'}

    def test_healthz_is_not_guest_gated(self):
        """It is a plain Django view — no JWT required, no redirect to login."""
        response = self.client.get('/healthz/')
        assert response.status_code == 200