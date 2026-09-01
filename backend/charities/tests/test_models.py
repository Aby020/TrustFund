"""
Tests for CharityOrganization model.

Covers:
- Organization creation
- Valid Charity user ownership
- Rejection of non-Charity ownership
- Uniqueness/ownership constraints
- Verification status defaults
- Timestamps
- Important field validation
"""
import pytest
from django.core.exceptions import ValidationError
from django.db import IntegrityError

from users.models import Role, User
from charities.models import CharityOrganization, VerificationStatus


@pytest.mark.django_db
class TestCharityOrganizationModel:
    """Tests for CharityOrganization model."""

    def setup_method(self):
        """Set up test data."""
        self.charity_user = User.objects.create_user(
            email='charity@example.com',
            password='SecurePass123!',
            first_name='Charity',
            last_name='User',
            role=Role.CHARITY,
        )
        self.donor_user = User.objects.create_user(
            email='donor@example.com',
            password='SecurePass123!',
            first_name='Donor',
            last_name='User',
            role=Role.DONOR,
        )
        self.volunteer_user = User.objects.create_user(
            email='volunteer@example.com',
            password='SecurePass123!',
            first_name='Volunteer',
            last_name='User',
            role=Role.VOLUNTEER,
        )
        self.admin_user = User.objects.create_user(
            email='admin@example.com',
            password='SecurePass123!',
            first_name='Admin',
            last_name='User',
            role=Role.ADMIN,
        )

        self.valid_org_data = {
            'owner': self.charity_user,
            'name': 'Helping Hands Foundation',
            'description': 'A charity helping those in need.',
            'email': 'contact@helpinghands.org',
            'phone': '+1-555-0123',
            'website': 'https://helpinghands.org',
            'address': '123 Main Street',
            'city': 'New York',
            'state': 'NY',
            'country': 'United States',
            'registration_number': 'CH-12345678',
        }

    def test_create_organization_success(self):
        """Test successful organization creation with valid Charity user."""
        org = CharityOrganization.objects.create(**self.valid_org_data)

        assert org.pk is not None
        assert org.name == 'Helping Hands Foundation'
        assert org.owner == self.charity_user
        assert org.email == 'contact@helpinghands.org'
        assert org.registration_number == 'CH-12345678'
        assert org.verification_status == VerificationStatus.PENDING
        assert org.verified_at is None
        assert org.rejection_reason == ''
        assert org.created_at is not None
        assert org.updated_at is not None

    def test_organization_defaults(self):
        """Test default values on organization creation."""
        org = CharityOrganization.objects.create(**self.valid_org_data)

        assert org.verification_status == VerificationStatus.PENDING
        assert org.verified_at is None
        assert org.rejection_reason == ''
        assert org.country == 'United States'

    def test_organization_str_representation(self):
        """Test string representation of organization."""
        org = CharityOrganization.objects.create(**self.valid_org_data)
        assert str(org) == 'Helping Hands Foundation'

    def test_organization_timestamps_auto_set(self):
        """Test created_at and updated_at are automatically set."""
        org = CharityOrganization.objects.create(**self.valid_org_data)

        assert org.created_at is not None
        assert org.updated_at is not None
        assert org.created_at <= org.updated_at

    def test_organization_updated_at_changes_on_save(self):
        """Test updated_at changes when organization is updated."""
        org = CharityOrganization.objects.create(**self.valid_org_data)
        original_updated = org.updated_at

        org.description = 'Updated description'
        org.save()

        assert org.updated_at > original_updated

    def test_charity_user_can_own_organization(self):
        """Test Charity role user can own an organization."""
        org = CharityOrganization.objects.create(**self.valid_org_data)
        assert org.owner == self.charity_user

    def test_donor_user_cannot_own_organization(self):
        """Test Donor role user cannot own an organization."""
        data = self.valid_org_data.copy()
        data['owner'] = self.donor_user
        data['name'] = 'Donor Org'
        data['registration_number'] = 'CH-99999999'

        org = CharityOrganization(**data)
        with pytest.raises(ValidationError) as exc:
            org.full_clean()

        assert 'owner' in exc.value.message_dict
        assert 'CHARITY role' in str(exc.value)

    def test_volunteer_user_cannot_own_organization(self):
        """Test Volunteer role user cannot own an organization."""
        data = self.valid_org_data.copy()
        data['owner'] = self.volunteer_user
        data['name'] = 'Volunteer Org'
        data['registration_number'] = 'CH-88888888'

        org = CharityOrganization(**data)
        with pytest.raises(ValidationError) as exc:
            org.full_clean()

        assert 'owner' in exc.value.message_dict
        assert 'CHARITY role' in str(exc.value)

    def test_admin_user_cannot_own_organization(self):
        """Test Admin role user cannot own an organization (via full_clean)."""
        data = self.valid_org_data.copy()
        data['owner'] = self.admin_user
        data['name'] = 'Admin Org'
        data['registration_number'] = 'CH-77777777'

        org = CharityOrganization(**data)
        with pytest.raises(ValidationError) as exc:
            org.full_clean()

        assert 'owner' in exc.value.message_dict
        assert 'CHARITY role' in str(exc.value)

    def test_unique_registration_number(self):
        """Test registration_number must be unique."""
        CharityOrganization.objects.create(**self.valid_org_data)

        data = self.valid_org_data.copy()
        data['name'] = 'Another Org'
        data['owner'] = User.objects.create_user(
            email='charity2@example.com',
            password='SecurePass123!',
            first_name='Charity',
            last_name='Two',
            role=Role.CHARITY,
        )

        # Django's full_clean catches unique constraint before DB
        org = CharityOrganization(**data)
        with pytest.raises(ValidationError) as exc:
            org.full_clean()

        assert 'registration_number' in exc.value.message_dict

    def test_unique_organization_name(self):
        """Test organization name must be unique."""
        CharityOrganization.objects.create(**self.valid_org_data)

        data = self.valid_org_data.copy()
        data['owner'] = User.objects.create_user(
            email='charity2@example.com',
            password='SecurePass123!',
            first_name='Charity',
            last_name='Two',
            role=Role.CHARITY,
        )
        data['registration_number'] = 'CH-99999999'

        # Django's full_clean catches unique constraint before DB
        org = CharityOrganization(**data)
        with pytest.raises(ValidationError) as exc:
            org.full_clean()

        assert 'name' in exc.value.message_dict

    def test_one_organization_per_charity_user(self):
        """Test a Charity user can only own one organization."""
        CharityOrganization.objects.create(**self.valid_org_data)

        data = self.valid_org_data.copy()
        data['name'] = 'Second Org'
        data['registration_number'] = 'CH-99999999'

        # Django's full_clean catches unique constraint before DB
        org = CharityOrganization(**data)
        with pytest.raises(ValidationError) as exc:
            org.full_clean()

        assert 'owner' in exc.value.message_dict

    def test_verification_status_pending_by_default(self):
        """Test verification status defaults to PENDING."""
        org = CharityOrganization.objects.create(**self.valid_org_data)
        assert org.verification_status == VerificationStatus.PENDING
        assert org.is_pending is True
        assert org.is_verified is False
        assert org.is_rejected is False

    def test_verification_status_verified(self):
        """Test setting verification status to VERIFIED."""
        org = CharityOrganization.objects.create(**self.valid_org_data)
        org.verification_status = VerificationStatus.VERIFIED
        org.save()

        assert org.verification_status == VerificationStatus.VERIFIED
        assert org.is_verified is True
        assert org.verified_at is not None

    def test_verification_status_rejected_requires_reason(self):
        """Test REJECTED status requires rejection_reason."""
        org = CharityOrganization.objects.create(**self.valid_org_data)
        org.verification_status = VerificationStatus.REJECTED

        with pytest.raises(ValidationError) as exc:
            org.full_clean()

        assert 'rejection_reason' in exc.value.message_dict

    def test_rejection_reason_required_for_rejected(self):
        """Test rejection_reason is required when status is REJECTED."""
        org = CharityOrganization.objects.create(**self.valid_org_data)
        org.verification_status = VerificationStatus.REJECTED
        org.rejection_reason = 'Insufficient documentation provided.'
        org.full_clean()  # Should not raise
        org.save()

        assert org.verification_status == VerificationStatus.REJECTED
        assert org.rejection_reason == 'Insufficient documentation provided.'
        assert org.is_rejected is True

    def test_rejection_reason_cleared_when_not_rejected(self):
        """Test rejection_reason cannot be set when status is not REJECTED."""
        org = CharityOrganization.objects.create(**self.valid_org_data)
        org.rejection_reason = 'Some reason'
        org.verification_status = VerificationStatus.PENDING

        with pytest.raises(ValidationError) as exc:
            org.full_clean()

        assert 'rejection_reason' in exc.value.message_dict

    def test_rejection_reason_cleared_when_verified(self):
        """Test rejection_reason cannot be set when status is VERIFIED."""
        org = CharityOrganization.objects.create(**self.valid_org_data)
        org.rejection_reason = 'Some reason'
        org.verification_status = VerificationStatus.VERIFIED

        with pytest.raises(ValidationError) as exc:
            org.full_clean()

        assert 'rejection_reason' in exc.value.message_dict

    def test_verified_at_set_automatically_on_verification(self):
        """Test verified_at is set automatically when status changes to VERIFIED."""
        org = CharityOrganization.objects.create(**self.valid_org_data)
        assert org.verified_at is None

        org.verification_status = VerificationStatus.VERIFIED
        org.save()

        assert org.verified_at is not None

    def test_verified_at_not_overwritten_on_subsequent_saves(self):
        """Test verified_at is not overwritten on subsequent saves after verification."""
        org = CharityOrganization.objects.create(**self.valid_org_data)
        org.verification_status = VerificationStatus.VERIFIED
        org.save()
        original_verified_at = org.verified_at

        org.description = 'Updated description'
        org.save()

        assert org.verified_at == original_verified_at

    def test_email_field_required(self):
        """Test email field is required."""
        data = self.valid_org_data.copy()
        data['email'] = ''

        org = CharityOrganization(**data)
        with pytest.raises(ValidationError) as exc:
            org.full_clean()

        assert 'email' in exc.value.message_dict

    def test_name_field_required(self):
        """Test name field is required."""
        data = self.valid_org_data.copy()
        data['name'] = ''

        org = CharityOrganization(**data)
        with pytest.raises(ValidationError) as exc:
            org.full_clean()

        assert 'name' in exc.value.message_dict

    def test_registration_number_required(self):
        """Test registration_number field is required."""
        data = self.valid_org_data.copy()
        data['registration_number'] = ''

        org = CharityOrganization(**data)
        with pytest.raises(ValidationError) as exc:
            org.full_clean()

        assert 'registration_number' in exc.value.message_dict

    def test_optional_fields_can_be_blank(self):
        """Test optional fields can be blank."""
        data = self.valid_org_data.copy()
        data['description'] = ''
        data['phone'] = ''
        data['website'] = ''
        data['address'] = ''
        data['city'] = ''
        data['state'] = ''

        org = CharityOrganization.objects.create(**data)
        assert org.description == ''
        assert org.phone == ''
        assert org.website == ''
        assert org.address == ''
        assert org.city == ''
        assert org.state == ''

    def test_related_name_charity_organization(self):
        """Test related_name 'charity_organization' on owner."""
        org = CharityOrganization.objects.create(**self.valid_org_data)

        # Access via related_name
        assert self.charity_user.charity_organization == org

    def test_cascade_protect_on_owner_delete(self):
        """Test PROTECT prevents deletion of owner with organization."""
        CharityOrganization.objects.create(**self.valid_org_data)

        with pytest.raises(IntegrityError):
            self.charity_user.delete()

    def test_indexes_exist(self):
        """Test that expected database indexes are defined in model Meta."""
        # Check model Meta indexes definition
        indexes = CharityOrganization._meta.indexes
        index_names = [idx.name for idx in indexes]

        assert 'ix_charity_org_status_date' in index_names
        assert 'ix_charity_org_location' in index_names

        # Check unique fields have indexes
        unique_fields = [
            f.name for f in CharityOrganization._meta.get_fields()
            if getattr(f, 'unique', False)
        ]
        assert 'name' in unique_fields
        assert 'registration_number' in unique_fields
        assert 'owner' in unique_fields  # via UniqueConstraint

        # Check db_index fields
        indexed_fields = [
            f.name for f in CharityOrganization._meta.get_fields()
            if getattr(f, 'db_index', False)
        ]
        assert 'name' in indexed_fields
        assert 'registration_number' in indexed_fields
        assert 'verification_status' in indexed_fields
        assert 'created_at' in indexed_fields

    def test_constraint_unique_owner(self):
        """Test unique constraint on owner field."""
        CharityOrganization.objects.create(**self.valid_org_data)

        data = self.valid_org_data.copy()
        data['name'] = 'Different Name'
        data['registration_number'] = 'CH-99999999'

        # Django's full_clean catches unique constraint before DB
        org = CharityOrganization(**data)
        with pytest.raises(ValidationError) as exc:
            org.full_clean()

        assert 'owner' in exc.value.message_dict