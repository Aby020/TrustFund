"""
Tests for the admin API slice (Batch 7 — Admin Experience).

Covers:
- Admin user list endpoint: access control, pagination, role filter, search
- Admin audit log endpoint: access control, action filter
- Audit recording: verification approve/reject and campaign lifecycle append
  real entries to the platform audit trail
"""
import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from admin_api.models import AuditAction, AuditLog
from campaigns.models import Campaign, CampaignCategory, CampaignStatus
from charities.models import CharityOrganization, VerificationStatus
from users.models import Role, User


@pytest.mark.django_db
class TestAdminUserList:
    """Tests for GET /api/v1/admin/users/."""

    def setup_method(self):
        self.client = APIClient()
        self.admin = User.objects.create_user(
            email='admin@example.com',
            password='SecurePass123!',
            first_name='Admin',
            last_name='User',
            role=Role.ADMIN,
        )
        self.donor = User.objects.create_user(
            email='donor@example.com',
            password='SecurePass123!',
            first_name='Dona',
            last_name='Tor',
            role=Role.DONOR,
        )
        self.charity = User.objects.create_user(
            email='charity@example.com',
            password='SecurePass123!',
            first_name='Char',
            last_name='Ity',
            role=Role.CHARITY,
        )

    def test_admin_can_list_users(self):
        """Admin sees a paginated list containing every platform user."""
        self.client.force_authenticate(user=self.admin)
        url = reverse('admin-user-list')
        response = self.client.get(url)

        assert response.status_code == status.HTTP_200_OK
        data = response.data
        assert data['count'] == 3
        emails = {u['email'] for u in data['results']}
        assert emails == {self.admin.email, self.donor.email, self.charity.email}
        assert data['results'][0]['role_display'] in {'Admin', 'Donor', 'Charity'}

    def test_donor_cannot_list_users(self):
        """Non-admin roles are rejected at the boundary with 403."""
        self.client.force_authenticate(user=self.donor)
        response = self.client.get(reverse('admin-user-list'))
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_charity_cannot_list_users(self):
        self.client.force_authenticate(user=self.charity)
        response = self.client.get(reverse('admin-user-list'))
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_unauthenticated_cannot_list_users(self):
        response = self.client.get(reverse('admin-user-list'))
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_role_filter(self):
        """Role filter narrows the result set."""
        self.client.force_authenticate(user=self.admin)
        response = self.client.get(reverse('admin-user-list'), {'role': Role.CHARITY})

        assert response.status_code == status.HTTP_200_OK
        assert response.data['count'] == 1
        assert response.data['results'][0]['email'] == self.charity.email

    def test_search_by_email(self):
        """Search filters by email/name."""
        self.client.force_authenticate(user=self.admin)
        response = self.client.get(reverse('admin-user-list'), {'search': 'donor@'})

        assert response.status_code == status.HTTP_200_OK
        assert response.data['count'] == 1
        assert response.data['results'][0]['email'] == self.donor.email

    def test_active_filter(self):
        """is_active=false returns only deactivated accounts."""
        self.donor.is_active = False
        self.donor.save()
        self.client.force_authenticate(user=self.admin)
        response = self.client.get(reverse('admin-user-list'), {'is_active': 'false'})

        assert response.status_code == status.HTTP_200_OK
        assert response.data['count'] == 1
        assert response.data['results'][0]['email'] == self.donor.email


@pytest.mark.django_db
class TestAdminAuditLogList:
    """Tests for GET /api/v1/admin/audit-logs/."""

    def setup_method(self):
        self.client = APIClient()
        self.admin = User.objects.create_user(
            email='admin@example.com',
            password='SecurePass123!',
            first_name='Admin',
            last_name='User',
            role=Role.ADMIN,
        )
        self.donor = User.objects.create_user(
            email='donor@example.com',
            password='SecurePass123!',
            first_name='Donor',
            last_name='User',
            role=Role.DONOR,
        )

    def test_admin_can_list_audit_logs(self):
        AuditLog.objects.create(
            actor=self.admin,
            action=AuditAction.VERIFICATION_APPROVE,
            resource_type='CharityOrganization',
            resource_label='Helping Hands',
        )
        self.client.force_authenticate(user=self.admin)
        response = self.client.get(reverse('admin-audit-log-list'))

        assert response.status_code == status.HTTP_200_OK
        assert response.data['count'] == 1
        entry = response.data['results'][0]
        assert entry['action'] == AuditAction.VERIFICATION_APPROVE
        assert entry['actor_name'] == 'Admin User'
        assert entry['resource_label'] == 'Helping Hands'

    def test_non_admin_cannot_list_audit_logs(self):
        self.client.force_authenticate(user=self.donor)
        response = self.client.get(reverse('admin-audit-log-list'))
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_unauthenticated_cannot_list_audit_logs(self):
        response = self.client.get(reverse('admin-audit-log-list'))
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_action_filter(self):
        AuditLog.objects.create(
            actor=self.admin,
            action=AuditAction.VERIFICATION_APPROVE,
            resource_type='CharityOrganization',
            resource_label='Org A',
        )
        AuditLog.objects.create(
            actor=self.admin,
            action=AuditAction.CAMPAIGN_CREATED,
            resource_type='Campaign',
            resource_label='Camp B',
        )
        self.client.force_authenticate(user=self.admin)
        response = self.client.get(
            reverse('admin-audit-log-list'),
            {'action': AuditAction.CAMPAIGN_CREATED},
        )

        assert response.status_code == status.HTTP_200_OK
        assert response.data['count'] == 1
        assert response.data['results'][0]['resource_label'] == 'Camp B'

    def test_ordering_newest_first(self):
        """Entries are returned newest-first by default."""
        older = AuditLog.objects.create(
            actor=self.admin,
            action=AuditAction.VERIFICATION_APPROVE,
            resource_type='CharityOrganization',
            resource_label='Oldest',
        )
        newer = AuditLog.objects.create(
            actor=self.admin,
            action=AuditAction.CAMPAIGN_CREATED,
            resource_type='Campaign',
            resource_label='Newest',
        )
        self.client.force_authenticate(user=self.admin)
        response = self.client.get(reverse('admin-audit-log-list'))

        assert response.status_code == status.HTTP_200_OK
        assert response.data['results'][0]['id'] == newer.id


@pytest.mark.django_db
class TestAuditRecording:
    """Verification decisions and campaign lifecycle append audit entries."""

    def setup_method(self):
        self.client = APIClient()
        self.admin = User.objects.create_user(
            email='admin@example.com',
            password='SecurePass123!',
            first_name='Admin',
            last_name='User',
            role=Role.ADMIN,
        )
        self.charity_user = User.objects.create_user(
            email='charity@example.com',
            password='SecurePass123!',
            first_name='Charity',
            last_name='User',
            role=Role.CHARITY,
        )
        self.org = CharityOrganization.objects.create(
            owner=self.charity_user,
            name='Helping Hands Foundation',
            email='contact@helpinghands.org',
            registration_number='CH-12345678',
        )

    def test_approve_records_audit_entry(self):
        self.org.submit_for_verification(self.charity_user)
        self.client.force_authenticate(user=self.admin)
        response = self.client.post(
            reverse('charity-approve', kwargs={'pk': self.org.pk}), format='json'
        )

        assert response.status_code == status.HTTP_200_OK
        entry = AuditLog.objects.get(
            action=AuditAction.VERIFICATION_APPROVE,
            resource_type='CharityOrganization',
        )
        assert entry.actor == self.admin
        assert entry.resource_label == self.org.name

    def test_reject_records_audit_entry_with_reason(self):
        self.org.submit_for_verification(self.charity_user)
        self.client.force_authenticate(user=self.admin)
        response = self.client.post(
            reverse('charity-reject', kwargs={'pk': self.org.pk}),
            {'rejection_reason': 'Insufficient documentation provided.'},
            format='json',
        )

        assert response.status_code == status.HTTP_200_OK
        entry = AuditLog.objects.get(
            action=AuditAction.VERIFICATION_REJECT,
            resource_type='CharityOrganization',
        )
        assert entry.detail == 'Insufficient documentation provided.'
        assert entry.resource_label == self.org.name

    def test_campaign_create_records_audit_entry(self):
        self.org.verification_status = VerificationStatus.VERIFIED
        self.org.save()
        self.client.force_authenticate(user=self.charity_user)
        url = reverse('campaign-list')
        response = self.client.post(url, {
            'title': 'Clean Water Drive',
            'description': 'Bringing clean water to villages.',
            'category': CampaignCategory.COMMUNITY,
            'goal_amount': '100000',
            'location': 'Kalahandi, Odisha',
            'start_date': '2026-10-01',
            'end_date': '2027-06-30',
            'status': CampaignStatus.ACTIVE,
        }, format='json')

        assert response.status_code == status.HTTP_201_CREATED
        entry = AuditLog.objects.get(
            action=AuditAction.CAMPAIGN_CREATED,
            resource_type='Campaign',
        )
        assert entry.resource_label == 'Clean Water Drive'
        assert entry.actor == self.charity_user