"""
Tests for Charity Organization verification workflow API endpoints.

Covers:
- Submission
- Admin approval
- Admin rejection
- Rejection reason validation
- Invalid state transitions
- Authorization checks
- Charity RBAC (unauthenticated, wrong roles)
- Charity validation error handling
- Verification audit logging (from_status / to_status)
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


@pytest.mark.django_db
class TestCharityRBAC:
    """RBAC tests for charity organization endpoints."""

    def setup_method(self):
        self.client = APIClient()
        self.charity_user = User.objects.create_user(
            email='charity_rbac@example.com',
            password='SecurePass123!',
            role=Role.CHARITY,
        )
        self.other_charity_user = User.objects.create_user(
            email='other_charity@example.com',
            password='SecurePass123!',
            role=Role.CHARITY,
        )
        self.admin_user = User.objects.create_user(
            email='admin_rbac@example.com',
            password='SecurePass123!',
            role=Role.ADMIN,
        )
        self.donor_user = User.objects.create_user(
            email='donor_rbac@example.com',
            password='SecurePass123!',
            role=Role.DONOR,
        )
        self.volunteer_user = User.objects.create_user(
            email='volunteer_rbac@example.com',
            password='SecurePass123!',
            role=Role.VOLUNTEER,
        )
        self.org = CharityOrganization.objects.create(
            owner=self.charity_user,
            name='RBAC Test Foundation',
            email='rbac@test.org',
            registration_number='RBAC-001',
        )

    # ---- Unauthenticated access ----

    def test_unauthenticated_cannot_list_charities(self):
        response = self.client.get('/api/v1/charities/')
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_unauthenticated_cannot_create_charity(self):
        response = self.client.post('/api/v1/charities/create/', {}, format='json')
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_unauthenticated_cannot_view_charity_detail(self):
        response = self.client.get(f'/api/v1/charities/{self.org.pk}/')
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_unauthenticated_cannot_submit_verification(self):
        response = self.client.post(f'/api/v1/charities/{self.org.pk}/submit/', format='json')
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_unauthenticated_cannot_approve_verification(self):
        response = self.client.post(f'/api/v1/charities/{self.org.pk}/approve/', format='json')
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_unauthenticated_cannot_reject_verification(self):
        response = self.client.post(f'/api/v1/charities/{self.org.pk}/reject/', format='json')
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    # ---- Role-based creation ----

    def test_donor_cannot_create_charity(self):
        self.client.force_authenticate(user=self.donor_user)
        payload = {
            'name': 'Fake Charity',
            'email': 'fake@charity.org',
            'registration_number': 'FAKE-001',
        }
        response = self.client.post('/api/v1/charities/create/', payload, format='json')
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_volunteer_cannot_create_charity(self):
        self.client.force_authenticate(user=self.volunteer_user)
        payload = {
            'name': 'Fake Charity',
            'email': 'fake@charity.org',
            'registration_number': 'FAKE-002',
        }
        response = self.client.post('/api/v1/charities/create/', payload, format='json')
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_charity_can_create_own_organization(self):
        new_charity = User.objects.create_user(
            email='new_charity@example.com',
            password='SecurePass123!',
            role=Role.CHARITY,
        )
        self.client.force_authenticate(user=new_charity)
        payload = {
            'name': 'New Foundation',
            'email': 'new@foundation.org',
            'registration_number': 'NEW-001',
        }
        response = self.client.post('/api/v1/charities/create/', payload, format='json')
        assert response.status_code == status.HTTP_201_CREATED

    def test_charity_cannot_create_second_organization(self):
        """A charity user can only own one organization."""
        self.client.force_authenticate(user=self.charity_user)
        payload = {
            'name': 'Duplicate Foundation',
            'email': 'dup@foundation.org',
            'registration_number': 'DUP-001',
        }
        response = self.client.post('/api/v1/charities/create/', payload, format='json')
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    # ---- Ownership isolation ----

    def test_charity_cannot_update_other_organization(self):
        """Charity owner cannot update another charity's organization."""
        self.client.force_authenticate(user=self.other_charity_user)
        url = f'/api/v1/charities/{self.org.pk}/'
        response = self.client.patch(url, {'name': 'Hacked Name'}, format='json')
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_donor_cannot_update_charity_organization(self):
        self.client.force_authenticate(user=self.donor_user)
        url = f'/api/v1/charities/{self.org.pk}/'
        response = self.client.patch(url, {'name': 'Hacked Name'}, format='json')
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_admin_can_update_charity_organization(self):
        self.client.force_authenticate(user=self.admin_user)
        url = f'/api/v1/charities/{self.org.pk}/'
        response = self.client.patch(url, {'description': 'Admin updated.'}, format='json')
        assert response.status_code == status.HTTP_200_OK
        self.org.refresh_from_db()
        assert self.org.description == 'Admin updated.'

    def test_charity_cannot_submit_other_organization(self):
        self.client.force_authenticate(user=self.other_charity_user)
        url = f'/api/v1/charities/{self.org.pk}/submit/'
        response = self.client.post(url, format='json')
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_donor_cannot_approve_verification(self):
        self.org.submit_for_verification(self.charity_user)
        self.client.force_authenticate(user=self.donor_user)
        url = f'/api/v1/charities/{self.org.pk}/approve/'
        response = self.client.post(url, format='json')
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_volunteer_cannot_approve_verification(self):
        self.org.submit_for_verification(self.charity_user)
        self.client.force_authenticate(user=self.volunteer_user)
        url = f'/api/v1/charities/{self.org.pk}/approve/'
        response = self.client.post(url, format='json')
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_charity_cannot_approve_verification(self):
        self.org.submit_for_verification(self.charity_user)
        self.client.force_authenticate(user=self.charity_user)
        url = f'/api/v1/charities/{self.org.pk}/approve/'
        response = self.client.post(url, format='json')
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_donor_cannot_reject_verification(self):
        self.org.submit_for_verification(self.charity_user)
        self.client.force_authenticate(user=self.donor_user)
        url = f'/api/v1/charities/{self.org.pk}/reject/'
        response = self.client.post(url, {'rejection_reason': 'Not allowed.'}, format='json')
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_charity_cannot_reject_verification(self):
        self.org.submit_for_verification(self.charity_user)
        self.client.force_authenticate(user=self.charity_user)
        url = f'/api/v1/charities/{self.org.pk}/reject/'
        response = self.client.post(url, {'rejection_reason': 'Not allowed.'}, format='json')
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_charity_cannot_resubmit_other_organization(self):
        self.org.verification_status = VerificationStatus.REJECTED
        self.org.rejection_reason = 'Test rejection.'
        self.org.save()
        self.client.force_authenticate(user=self.other_charity_user)
        url = f'/api/v1/charities/{self.org.pk}/resubmit/'
        response = self.client.post(url, format='json')
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_donor_cannot_view_verification_history(self):
        self.client.force_authenticate(user=self.donor_user)
        url = f'/api/v1/charities/{self.org.pk}/history/'
        response = self.client.get(url)
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_volunteer_cannot_view_my_organization(self):
        self.client.force_authenticate(user=self.volunteer_user)
        response = self.client.get('/api/v1/charities/me/')
        assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
class TestCharityValidationErrors:
    """Tests that validation errors return proper 400 responses."""

    def setup_method(self):
        self.client = APIClient()
        self.charity_user = User.objects.create_user(
            email='charity_val@example.com',
            password='SecurePass123!',
            role=Role.CHARITY,
        )
        self.admin_user = User.objects.create_user(
            email='admin_val@example.com',
            password='SecurePass123!',
            role=Role.ADMIN,
        )
        self.org = CharityOrganization.objects.create(
            owner=self.charity_user,
            name='Validation Test Org',
            email='val@test.org',
            registration_number='VAL-001',
        )

    def test_create_with_duplicate_registration_returns_400(self):
        """Creating an org with a duplicate registration number returns 400."""
        new_charity = User.objects.create_user(
            email='new_val_charity@example.com',
            password='SecurePass123!',
            role=Role.CHARITY,
        )
        self.client.force_authenticate(user=new_charity)
        payload = {
            'name': 'Duplicate Registration Org',
            'email': 'dup@reg.org',
            'registration_number': 'VAL-001',  # duplicate
        }
        response = self.client.post('/api/v1/charities/create/', payload, format='json')
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_create_with_missing_required_fields_returns_400(self):
        new_charity = User.objects.create_user(
            email='missing_fields@example.com',
            password='SecurePass123!',
            role=Role.CHARITY,
        )
        self.client.force_authenticate(user=new_charity)
        response = self.client.post('/api/v1/charities/create/', {}, format='json')
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_patch_verification_field_returns_400(self):
        """Attempting to update a verification field via PATCH returns 400."""
        self.client.force_authenticate(user=self.charity_user)
        url = f'/api/v1/charities/{self.org.pk}/'
        response = self.client.patch(url, {'verification_status': 'VERIFIED'}, format='json')
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_patch_owner_field_returns_400(self):
        """Attempting to change the owner via PATCH returns 400."""
        self.client.force_authenticate(user=self.charity_user)
        url = f'/api/v1/charities/{self.org.pk}/'
        response = self.client.patch(url, {'owner': self.admin_user.pk}, format='json')
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_reject_without_reason_returns_400(self):
        """Rejecting verification without a reason returns 400."""
        self.org.submit_for_verification(self.charity_user)
        self.client.force_authenticate(user=self.admin_user)
        url = f'/api/v1/charities/{self.org.pk}/reject/'
        response = self.client.post(url, {}, format='json')
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_reject_with_short_reason_returns_400(self):
        """Rejecting with a reason shorter than 10 chars returns 400."""
        self.org.submit_for_verification(self.charity_user)
        self.client.force_authenticate(user=self.admin_user)
        url = f'/api/v1/charities/{self.org.pk}/reject/'
        response = self.client.post(url, {'rejection_reason': 'Too short'}, format='json')
        assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
class TestVerificationAuditLogging:
    """Tests that verification audit logs record actual from_status and to_status."""

    def setup_method(self):
        self.client = APIClient()
        self.charity_user = User.objects.create_user(
            email='charity_audit@example.com',
            password='SecurePass123!',
            role=Role.CHARITY,
        )
        self.admin_user = User.objects.create_user(
            email='admin_audit@example.com',
            password='SecurePass123!',
            role=Role.ADMIN,
        )
        self.org = CharityOrganization.objects.create(
            owner=self.charity_user,
            name='Audit Test Org',
            email='audit@test.org',
            registration_number='AUDIT-001',
        )

    def test_submit_logs_correct_status_transition(self):
        """Submit action logs from_status and to_status correctly."""
        self.client.force_authenticate(user=self.charity_user)
        url = reverse('charity-submit', kwargs={'pk': self.org.pk})
        self.client.post(url, format='json')

        log = VerificationLog.objects.filter(
            organization=self.org, action=VerificationAction.SUBMIT
        ).latest('created_at')
        assert log.from_status == VerificationStatus.PENDING
        assert log.to_status == VerificationStatus.PENDING
        assert log.performed_by == self.charity_user

    def test_approve_logs_correct_status_transition(self):
        """Approve action logs from_status=PENDING, to_status=VERIFIED."""
        self.org.submit_for_verification(self.charity_user)
        self.client.force_authenticate(user=self.admin_user)
        url = reverse('charity-approve', kwargs={'pk': self.org.pk})
        self.client.post(url, format='json')

        log = VerificationLog.objects.filter(
            organization=self.org, action=VerificationAction.APPROVE
        ).latest('created_at')
        assert log.from_status == VerificationStatus.PENDING
        assert log.to_status == VerificationStatus.VERIFIED
        assert log.performed_by == self.admin_user

    def test_reject_logs_correct_status_transition(self):
        """Reject action logs from_status=PENDING, to_status=REJECTED."""
        self.org.submit_for_verification(self.charity_user)
        self.client.force_authenticate(user=self.admin_user)
        url = reverse('charity-reject', kwargs={'pk': self.org.pk})
        self.client.post(url, {'rejection_reason': 'Insufficient documentation.'}, format='json')

        log = VerificationLog.objects.filter(
            organization=self.org, action=VerificationAction.REJECT
        ).latest('created_at')
        assert log.from_status == VerificationStatus.PENDING
        assert log.to_status == VerificationStatus.REJECTED
        assert log.reason == 'Insufficient documentation.'

    def test_resubmit_logs_correct_status_transition(self):
        """Resubmit action logs from_status=REJECTED, to_status=PENDING."""
        self.org.submit_for_verification(self.charity_user)
        self.org.reject_verification(self.admin_user, 'Need more info.')
        self.org.refresh_from_db()

        self.client.force_authenticate(user=self.charity_user)
        url = reverse('charity-resubmit', kwargs={'pk': self.org.pk})
        self.client.post(url, format='json')

        log = VerificationLog.objects.filter(
            organization=self.org, action=VerificationAction.RESUBMIT
        ).latest('created_at')
        assert log.from_status == VerificationStatus.REJECTED
        assert log.to_status == VerificationStatus.PENDING
        assert log.performed_by == self.charity_user

    def test_history_view_shows_accurate_audit_trail(self):
        """Full audit trail reflects actual status transitions."""
        self.client.force_authenticate(user=self.charity_user)
        self.client.post(reverse('charity-submit', kwargs={'pk': self.org.pk}), format='json')

        self.client.force_authenticate(user=self.admin_user)
        self.client.post(reverse('charity-reject', kwargs={'pk': self.org.pk}),
                         {'rejection_reason': 'Incomplete documentation.'}, format='json')

        self.client.force_authenticate(user=self.charity_user)
        self.client.post(reverse('charity-resubmit', kwargs={'pk': self.org.pk}), format='json')

        self.client.force_authenticate(user=self.charity_user)
        response = self.client.get(reverse('charity-history', kwargs={'pk': self.org.pk}))
        assert response.status_code == status.HTTP_200_OK

        logs = response.data
        assert len(logs) >= 3

        # Most recent: RESUBMIT (REJECTED -> PENDING)
        assert logs[0]['action'] == VerificationAction.RESUBMIT
        assert logs[0]['from_status'] == VerificationStatus.REJECTED
        assert logs[0]['to_status'] == VerificationStatus.PENDING

        # Middle: REJECT (PENDING -> REJECTED)
        assert logs[1]['action'] == VerificationAction.REJECT
        assert logs[1]['from_status'] == VerificationStatus.PENDING
        assert logs[1]['to_status'] == VerificationStatus.REJECTED

        # Oldest: SUBMIT (PENDING -> PENDING)
        assert logs[2]['action'] == VerificationAction.SUBMIT
        assert logs[2]['from_status'] == VerificationStatus.PENDING
        assert logs[2]['to_status'] == VerificationStatus.PENDING