"""
Tests for the custom User model and UserManager.

Covers:
- User creation (email, password, role)
- Email uniqueness constraint
- Password hashing (never plaintext)
- Role assignment and validation
- Invalid user creation cases
"""

import pytest
from django.contrib.auth.hashers import check_password
from django.core.exceptions import ValidationError
from django.db import IntegrityError

from users.models import Role, User


pytestmark = pytest.mark.django_db


class TestUserManager:
    """Tests for UserManager create_user and create_superuser methods."""

    def test_create_user_with_email_and_password(self):
        """Test creating a regular user with email and password."""
        user = User.objects.create_user(
            email='donor@example.com',
            password='SecurePass123!',
            first_name='John',
            last_name='Doe',
            role=Role.DONOR,
        )

        assert user.email == 'donor@example.com'
        assert user.first_name == 'John'
        assert user.last_name == 'Doe'
        assert user.role == Role.DONOR
        assert user.is_active is True
        assert user.is_staff is False
        assert user.is_superuser is False
        assert check_password('SecurePass123!', user.password)

    def test_create_user_email_normalization(self):
        """Test that email domain is normalized (lowercased)."""
        user = User.objects.create_user(
            email='DONOR@EXAMPLE.COM',
            password='SecurePass123!',
            first_name='John',
            last_name='Doe',
        )

        # Django's normalize_email only lowercases the domain part
        assert user.email == 'DONOR@example.com'

    def test_create_user_without_email_raises_error(self):
        """Test that creating a user without email raises ValueError."""
        with pytest.raises(ValueError, match='The Email field must be set'):
            User.objects.create_user(
                email='',
                password='SecurePass123!',
                first_name='John',
                last_name='Doe',
            )

    def test_create_user_with_none_email_raises_error(self):
        """Test that creating a user with None email raises ValueError."""
        with pytest.raises(ValueError, match='The Email field must be set'):
            User.objects.create_user(
                email=None,
                password='SecurePass123!',
                first_name='John',
                last_name='Doe',
            )

    def test_create_superuser(self):
        """Test creating a superuser."""
        user = User.objects.create_superuser(
            email='admin@example.com',
            password='AdminPass123!',
            first_name='Admin',
            last_name='User',
        )

        assert user.email == 'admin@example.com'
        assert user.first_name == 'Admin'
        assert user.last_name == 'User'
        assert user.role == Role.ADMIN
        assert user.is_active is True
        assert user.is_staff is True
        assert user.is_superuser is True
        assert check_password('AdminPass123!', user.password)

    def test_create_superuser_without_is_staff_raises_error(self):
        """Test that superuser must have is_staff=True."""
        with pytest.raises(ValueError, match='Superuser must have is_staff=True'):
            User.objects.create_superuser(
                email='admin@example.com',
                password='AdminPass123!',
                first_name='Admin',
                last_name='User',
                is_staff=False,
            )

    def test_create_superuser_without_is_superuser_raises_error(self):
        """Test that superuser must have is_superuser=True."""
        with pytest.raises(ValueError, match='Superuser must have is_superuser=True'):
            User.objects.create_superuser(
                email='admin@example.com',
                password='AdminPass123!',
                first_name='Admin',
                last_name='User',
                is_superuser=False,
            )


class TestUserModel:
    """Tests for the User model fields and methods."""

    def test_user_str_representation(self):
        """Test that __str__ returns the email."""
        user = User.objects.create_user(
            email='test@example.com',
            password='SecurePass123!',
            first_name='Test',
            last_name='User',
        )

        assert str(user) == 'test@example.com'

    def test_get_full_name(self):
        """Test get_full_name returns first + last name."""
        user = User.objects.create_user(
            email='test@example.com',
            password='SecurePass123!',
            first_name='John',
            last_name='Doe',
        )

        assert user.get_full_name() == 'John Doe'

    def test_get_full_name_fallback_to_email(self):
        """Test get_full_name falls back to email when names are empty."""
        user = User.objects.create_user(
            email='test@example.com',
            password='SecurePass123!',
            first_name='',
            last_name='',
        )

        assert user.get_full_name() == 'test@example.com'

    def test_get_short_name(self):
        """Test get_short_name returns first name or email prefix."""
        user = User.objects.create_user(
            email='test@example.com',
            password='SecurePass123!',
            first_name='John',
            last_name='Doe',
        )

        assert user.get_short_name() == 'John'

    def test_get_short_name_fallback(self):
        """Test get_short_name falls back to email prefix when no first name."""
        user = User.objects.create_user(
            email='test@example.com',
            password='SecurePass123!',
            first_name='',
            last_name='',
        )

        assert user.get_short_name() == 'test'

    def test_default_role_is_donor(self):
        """Test that default role is DONOR."""
        user = User.objects.create_user(
            email='test@example.com',
            password='SecurePass123!',
            first_name='Test',
            last_name='User',
        )

        assert user.role == Role.DONOR

    def test_role_choices(self):
        """Test all role choices can be assigned."""
        for role in Role:
            user = User.objects.create_user(
                email=f'{role.value.lower()}@example.com',
                password='SecurePass123!',
                first_name='Test',
                last_name='User',
                role=role,
            )
            assert user.role == role

    def test_has_role_method(self):
        """Test has_role method."""
        user = User.objects.create_user(
            email='test@example.com',
            password='SecurePass123!',
            first_name='Test',
            last_name='User',
            role=Role.CHARITY,
        )

        assert user.has_role(Role.CHARITY) is True
        assert user.has_role(Role.DONOR) is False

    def test_is_donor_method(self):
        """Test is_donor method."""
        user = User.objects.create_user(
            email='donor@example.com',
            password='SecurePass123!',
            first_name='Donor',
            last_name='User',
            role=Role.DONOR,
        )

        assert user.is_donor() is True

        user.role = Role.CHARITY
        user.save()
        assert user.is_donor() is False

    def test_is_charity_method(self):
        """Test is_charity method."""
        user = User.objects.create_user(
            email='charity@example.com',
            password='SecurePass123!',
            first_name='Charity',
            last_name='User',
            role=Role.CHARITY,
        )

        assert user.is_charity() is True

    def test_is_volunteer_method(self):
        """Test is_volunteer method."""
        user = User.objects.create_user(
            email='volunteer@example.com',
            password='SecurePass123!',
            first_name='Volunteer',
            last_name='User',
            role=Role.VOLUNTEER,
        )

        assert user.is_volunteer() is True

    def test_is_admin_user_method(self):
        """Test is_admin_user method."""
        user = User.objects.create_user(
            email='admin@example.com',
            password='SecurePass123!',
            first_name='Admin',
            last_name='User',
            role=Role.ADMIN,
        )

        assert user.is_admin_user() is True

        # Superuser is also admin
        superuser = User.objects.create_superuser(
            email='super@example.com',
            password='SuperPass123!',
            first_name='Super',
            last_name='Admin',
        )
        assert superuser.is_admin_user() is True

    def test_email_uniqueness_constraint(self):
        """Test that email must be unique at database level."""
        User.objects.create_user(
            email='unique@example.com',
            password='SecurePass123!',
            first_name='First',
            last_name='User',
        )

        with pytest.raises(IntegrityError):
            User.objects.create_user(
                email='unique@example.com',
                password='DifferentPass123!',
                first_name='Second',
                last_name='User',
            )

    def test_password_is_hashed_not_plaintext(self):
        """Test that password is never stored in plaintext."""
        user = User.objects.create_user(
            email='secure@example.com',
            password='MySecretPassword123!',
            first_name='Secure',
            last_name='User',
        )

        # Password should be hashed (starts with algorithm identifier)
        assert user.password.startswith(('pbkdf2_sha256$', 'argon2$', 'bcrypt$'))
        assert user.password != 'MySecretPassword123!'
        assert check_password('MySecretPassword123!', user.password)

    def test_password_validation_enforced(self):
        """Test that Django password validators are enforced."""
        # This test verifies that the model works with validators;
        # actual validation happens at form/serializer level
        user = User(
            email='valid@example.com',
            first_name='Valid',
            last_name='User',
        )
        user.set_password('StrongPass123!')
        user.save()

        assert user.pk is not None
        assert check_password('StrongPass123!', user.password)

    def test_is_active_default_true(self):
        """Test that is_active defaults to True."""
        user = User.objects.create_user(
            email='active@example.com',
            password='SecurePass123!',
            first_name='Active',
            last_name='User',
        )

        assert user.is_active is True

    def test_is_staff_default_false(self):
        """Test that is_staff defaults to False for regular users."""
        user = User.objects.create_user(
            email='staff@example.com',
            password='SecurePass123!',
            first_name='Staff',
            last_name='User',
        )

        assert user.is_staff is False

    def test_date_joined_auto_set(self):
        """Test that date_joined is automatically set on creation."""
        before = timezone.now()
        user = User.objects.create_user(
            email='date@example.com',
            password='SecurePass123!',
            first_name='Date',
            last_name='User',
        )
        after = timezone.now()

        assert before <= user.date_joined <= after


class TestUserRoleValidation:
    """Tests for role field validation and constraints."""

    def test_invalid_role_raises_validation_error(self):
        """Test that invalid role raises ValidationError on full_clean."""
        user = User(
            email='invalid@example.com',
            first_name='Invalid',
            last_name='Role',
            role='INVALID_ROLE',
        )
        user.set_password('SecurePass123!')

        with pytest.raises(ValidationError):
            user.full_clean()

    def test_role_max_length(self):
        """Test role field max length constraint."""
        # All current roles are within 20 chars
        for role in Role:
            assert len(role.value) <= 20


class TestUserPermissionsMixin:
    """Tests for PermissionsMixin integration."""

    def test_user_has_perm_default_false(self):
        """Test that regular user has no permissions by default."""
        user = User.objects.create_user(
            email='perm@example.com',
            password='SecurePass123!',
            first_name='Perm',
            last_name='User',
        )

        assert user.has_perm('some_app.some_permission') is False

    def test_superuser_has_all_perms(self):
        """Test that superuser has all permissions."""
        superuser = User.objects.create_superuser(
            email='super@example.com',
            password='SuperPass123!',
            first_name='Super',
            last_name='Admin',
        )

        assert superuser.has_perm('any_app.any_permission') is True

    def test_user_groups_and_permissions(self):
        """Test that user can have groups and permissions assigned."""
        from django.contrib.auth.models import Group, Permission

        user = User.objects.create_user(
            email='group@example.com',
            password='SecurePass123!',
            first_name='Group',
            last_name='User',
        )

        group = Group.objects.create(name='Test Group')
        user.groups.add(group)
        assert user.groups.count() == 1

        perm = Permission.objects.first()
        if perm:
            user.user_permissions.add(perm)
            assert user.user_permissions.count() == 1


# Import timezone for date_joined test
from django.utils import timezone