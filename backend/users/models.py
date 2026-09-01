"""
Custom User model for TrustFund.

Uses email as the unique login identifier with role-based access control.
"""

from django.contrib.auth.models import (
    AbstractBaseUser,
    BaseUserManager,
    PermissionsMixin,
)
from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _


class Role(models.TextChoices):
    """User roles for TrustFund."""

    DONOR = 'DONOR', _('Donor')
    CHARITY = 'CHARITY', _('Charity')
    VOLUNTEER = 'VOLUNTEER', _('Volunteer')
    ADMIN = 'ADMIN', _('Admin')


class UserManager(BaseUserManager):
    """
    Custom manager for User model.

    Provides create_user and create_superuser methods using email
    as the unique identifier instead of username.
    """

    def create_user(self, email, password=None, **extra_fields):
        """
        Create and return a regular user with an email and password.

        Args:
            email: The user's email address (used as username)
            password: The user's password (will be hashed)
            **extra_fields: Additional fields (first_name, last_name, role, etc.)

        Returns:
            User: The created user instance

        Raises:
            ValueError: If email is not provided
        """
        if not email:
            raise ValueError(_('The Email field must be set'))

        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        """
        Create and return a superuser with an email and password.

        Args:
            email: The superuser's email address
            password: The superuser's password (will be hashed)
            **extra_fields: Additional fields

        Returns:
            User: The created superuser instance
        """
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('is_active', True)
        extra_fields.setdefault('role', Role.ADMIN)

        if extra_fields.get('is_staff') is not True:
            raise ValueError(_('Superuser must have is_staff=True.'))
        if extra_fields.get('is_superuser') is not True:
            raise ValueError(_('Superuser must have is_superuser=True.'))

        return self.create_user(email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    """
    Custom User model for TrustFund.

    Uses email as the unique identifier (USERNAME_FIELD) instead of username.
    Includes role-based access control with four roles:
    DONOR, CHARITY, VOLUNTEER, ADMIN
    """

    email = models.EmailField(
        _('email address'),
        unique=True,
        db_index=True,
        help_text=_('Used as the unique login identifier'),
    )
    first_name = models.CharField(_('first name'), max_length=150, blank=True)
    last_name = models.CharField(_('last name'), max_length=150, blank=True)
    role = models.CharField(
        _('role'),
        max_length=20,
        choices=Role.choices,
        default=Role.DONOR,
        help_text=_('User role determining permissions and access'),
    )
    is_active = models.BooleanField(
        _('active'),
        default=True,
        help_text=_(
            'Designates whether this user should be treated as active. '
            'Unselect instead of deleting accounts.'
        ),
    )
    is_staff = models.BooleanField(
        _('staff status'),
        default=False,
        help_text=_('Designates whether the user can log into admin site.'),
    )
    date_joined = models.DateTimeField(_('date joined'), default=timezone.now)

    objects = UserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['first_name', 'last_name']

    class Meta:
        db_table = 'users'
        verbose_name = _('user')
        verbose_name_plural = _('users')
        ordering = ['-date_joined']
        indexes = [
            models.Index(fields=['email'], name='ix_users_email'),
            models.Index(fields=['role'], name='ix_users_role'),
            models.Index(fields=['is_active'], name='ix_users_is_active'),
        ]

    def __str__(self):
        return self.email

    def get_full_name(self):
        """Return the first_name plus the last_name, with a space in between."""
        full_name = f'{self.first_name} {self.last_name}'.strip()
        return full_name or self.email

    def get_short_name(self):
        """Return the short name for the user."""
        return self.first_name or self.email.split('@')[0]

    def has_role(self, role):
        """Check if user has a specific role."""
        return self.role == role

    def is_donor(self):
        """Check if user is a donor."""
        return self.role == Role.DONOR

    def is_charity(self):
        """Check if user is a charity."""
        return self.role == Role.CHARITY

    def is_volunteer(self):
        """Check if user is a volunteer."""
        return self.role == Role.VOLUNTEER

    def is_admin_user(self):
        """Check if user is an admin."""
        return self.role == Role.ADMIN or self.is_superuser