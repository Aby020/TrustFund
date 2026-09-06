"""
Tests for authentication API endpoints.

Covers:
- POST /api/v1/auth/register
- POST /api/v1/auth/login
- POST /api/v1/auth/refresh
- POST /api/v1/auth/logout
- GET /api/v1/auth/me
"""

import pytest
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError

from users.models import Role, User


@pytest.mark.django_db
class TestRegisterAPI:
    """Tests for POST /api/v1/auth/register"""

    def setup_method(self):
        self.client = APIClient()
        self.url = '/api/v1/auth/register/'
        self.valid_data = {
            'email': 'newuser@example.com',
            'password': 'SecurePass123!',
            'first_name': 'New',
            'last_name': 'User',
            'role': Role.DONOR,
        }

    def test_register_success(self):
        """Test successful user registration."""
        response = self.client.post(self.url, self.valid_data, format='json')

        assert response.status_code == 201
        assert 'user' in response.data
        assert 'access' in response.data
        assert 'refresh' in response.data
        assert response.data['user']['email'] == 'newuser@example.com'
        assert response.data['user']['first_name'] == 'New'
        assert response.data['user']['last_name'] == 'User'
        assert response.data['user']['role'] == Role.DONOR
        assert 'password' not in response.data['user']
        assert 'password' not in str(response.content)

    def test_register_default_role_donor(self):
        """Test registration defaults to DONOR role when not specified."""
        data = self.valid_data.copy()
        del data['role']
        response = self.client.post(self.url, data, format='json')

        assert response.status_code == 201
        assert response.data['user']['role'] == Role.DONOR

    def test_register_all_valid_roles(self):
        """Test registration with all valid non-admin roles."""
        for role in [Role.DONOR, Role.CHARITY, Role.VOLUNTEER]:
            data = self.valid_data.copy()
            data['email'] = f'{role.value.lower()}@example.com'
            data['role'] = role
            response = self.client.post(self.url, data, format='json')
            assert response.status_code == 201
            assert response.data['user']['role'] == role

    def test_register_duplicate_email(self):
        """Test registration fails with duplicate email."""
        self.client.post(self.url, self.valid_data, format='json')
        response = self.client.post(self.url, self.valid_data, format='json')

        assert response.status_code == 400
        assert 'email' in response.data or 'detail' in response.data

    def test_register_invalid_email_format(self):
        """Test registration fails with invalid email format."""
        data = self.valid_data.copy()
        data['email'] = 'not-an-email'
        response = self.client.post(self.url, data, format='json')

        assert response.status_code == 400
        assert 'email' in response.data

    def test_register_missing_email(self):
        """Test registration fails when email is missing."""
        data = self.valid_data.copy()
        del data['email']
        response = self.client.post(self.url, data, format='json')

        assert response.status_code == 400
        assert 'email' in response.data

    def test_register_weak_password(self):
        """Test registration fails with weak password."""
        data = self.valid_data.copy()
        data['password'] = 'weak'
        response = self.client.post(self.url, data, format='json')

        assert response.status_code == 400
        assert 'password' in response.data

    def test_register_password_too_short(self):
        """Test registration fails with password less than 8 characters."""
        data = self.valid_data.copy()
        data['password'] = 'Short1!'
        response = self.client.post(self.url, data, format='json')

        assert response.status_code == 400
        assert 'password' in response.data

    def test_register_missing_password(self):
        """Test registration fails when password is missing."""
        data = self.valid_data.copy()
        del data['password']
        response = self.client.post(self.url, data, format='json')

        assert response.status_code == 400
        assert 'password' in response.data

    def test_register_missing_first_name(self):
        """Test registration fails when first_name is missing."""
        data = self.valid_data.copy()
        del data['first_name']
        response = self.client.post(self.url, data, format='json')

        assert response.status_code == 400
        assert 'first_name' in response.data

    def test_register_missing_last_name(self):
        """Test registration fails when last_name is missing."""
        data = self.valid_data.copy()
        del data['last_name']
        response = self.client.post(self.url, data, format='json')

        assert response.status_code == 400
        assert 'last_name' in response.data

    def test_register_admin_role_rejected(self):
        """Test that normal users cannot register as ADMIN."""
        data = self.valid_data.copy()
        data['role'] = Role.ADMIN
        data['email'] = 'admin-attempt@example.com'
        response = self.client.post(self.url, data, format='json')

        assert response.status_code == 400
        assert 'role' in response.data

    def test_register_case_insensitive_email(self):
        """Test email is normalized to lowercase domain only."""
        data = self.valid_data.copy()
        data['email'] = 'NewUser@EXAMPLE.COM'
        response = self.client.post(self.url, data, format='json')

        assert response.status_code == 201
        # Email should be stored with lowercase domain (Django's normalize_email behavior)
        assert response.data['user']['email'] == 'NewUser@example.com'

    def test_register_no_tokens_in_user_object(self):
        """Test that tokens are not embedded in user object."""
        response = self.client.post(self.url, self.valid_data, format='json')

        user_data = response.data['user']
        assert 'access' not in user_data
        assert 'refresh' not in user_data


@pytest.mark.django_db
class TestLoginAPI:
    """Tests for POST /api/v1/auth/login"""

    def setup_method(self):
        self.client = APIClient()
        self.url = '/api/v1/auth/login/'
        self.user = User.objects.create_user(
            email='loginuser@example.com',
            password='SecurePass123!',
            first_name='Login',
            last_name='User',
            role=Role.DONOR,
        )

    def test_login_success(self):
        """Test successful login returns tokens and user data."""
        response = self.client.post(
            self.url,
            {'email': 'loginuser@example.com', 'password': 'SecurePass123!'},
            format='json'
        )

        assert response.status_code == 200
        assert 'user' in response.data
        assert 'access' in response.data
        assert 'refresh' in response.data
        assert response.data['user']['email'] == 'loginuser@example.com'

    def test_login_invalid_credentials_wrong_password(self):
        """Test login fails with wrong password."""
        response = self.client.post(
            self.url,
            {'email': 'loginuser@example.com', 'password': 'WrongPass123!'},
            format='json'
        )

        assert response.status_code == 400
        assert 'detail' in response.data or 'non_field_errors' in response.data

    def test_login_invalid_credentials_nonexistent_user(self):
        """Test login fails for nonexistent user."""
        response = self.client.post(
            self.url,
            {'email': 'nonexistent@example.com', 'password': 'SecurePass123!'},
            format='json'
        )

        assert response.status_code == 400
        assert 'detail' in response.data or 'non_field_errors' in response.data

    def test_login_missing_email(self):
        """Test login fails when email is missing."""
        response = self.client.post(
            self.url,
            {'password': 'SecurePass123!'},
            format='json'
        )

        assert response.status_code == 400

    def test_login_missing_password(self):
        """Test login fails when password is missing."""
        response = self.client.post(
            self.url,
            {'email': 'loginuser@example.com'},
            format='json'
        )

        assert response.status_code == 400

    def test_login_inactive_user(self):
        """Test login fails for inactive user."""
        self.user.is_active = False
        self.user.save()

        response = self.client.post(
            self.url,
            {'email': 'loginuser@example.com', 'password': 'SecurePass123!'},
            format='json'
        )

        assert response.status_code == 400
        assert 'detail' in response.data or 'non_field_errors' in response.data

    def test_login_case_insensitive_email(self):
        """Test login works with case variations in email."""
        response = self.client.post(
            self.url,
            {'email': 'LOGINUSER@EXAMPLE.COM', 'password': 'SecurePass123!'},
            format='json'
        )

        assert response.status_code == 200

    def test_login_no_password_in_response(self):
        """Test that password/hash is not in response."""
        response = self.client.post(
            self.url,
            {'email': 'loginuser@example.com', 'password': 'SecurePass123!'},
            format='json'
        )

        assert 'password' not in str(response.content)

    def test_login_rate_limited_after_throttle(self):
        """
        Repeated login attempts from one IP are throttled (429).

        Fires against the real configured rate (60/min) from a TEST-NET-3 IP so
        the check is hermetic and independent of the default 127.0.0.1 key that
        the rest of the auth suite shares.
        """
        from django.conf import settings

        allowed = settings.REST_FRAMEWORK['DEFAULT_THROTTLE_RATES']['auth']
        assert allowed == '60/min'  # keep this test honest if the rate moves

        client = APIClient()
        url = '/api/v1/auth/login/'
        payload = {'email': 'loginuser@example.com', 'password': 'WrongPass123!'}

        for _ in range(60):
            response = client.post(url, payload, format='json', REMOTE_ADDR='203.0.113.7')
            assert response.status_code == 400  # bad creds, within the allowance

        throttled = client.post(url, payload, format='json', REMOTE_ADDR='203.0.113.7')
        assert throttled.status_code == 429


@pytest.mark.django_db
class TestRefreshAPI:
    """Tests for POST /api/v1/auth/refresh"""

    def setup_method(self):
        self.client = APIClient()
        self.url = '/api/v1/auth/refresh/'
        self.user = User.objects.create_user(
            email='refreshuser@example.com',
            password='SecurePass123!',
            first_name='Refresh',
            last_name='User',
        )
        self.refresh_token = str(RefreshToken.for_user(self.user))

    def test_refresh_success(self):
        """Test successful token refresh."""
        response = self.client.post(
            self.url,
            {'refresh': self.refresh_token},
            format='json'
        )

        assert response.status_code == 200
        assert 'access' in response.data
        # With rotation enabled, new refresh token should be returned
        assert 'refresh' in response.data

    def test_refresh_invalid_token(self):
        """Test refresh fails with invalid token."""
        response = self.client.post(
            self.url,
            {'refresh': 'invalid.token.here'},
            format='json'
        )

        # Returns 400 for validation error, 401 for expired/invalid
        assert response.status_code in (400, 401)

    def test_refresh_missing_token(self):
        """Test refresh fails when refresh token is missing."""
        response = self.client.post(self.url, {}, format='json')

        assert response.status_code == 400
        assert 'refresh' in response.data

    def test_refresh_expired_token(self):
        """Test refresh fails with blacklisted token."""
        token = RefreshToken.for_user(self.user)
        token.blacklist()

        response = self.client.post(
            self.url,
            {'refresh': str(token)},
            format='json'
        )

        # Blacklisted token raises validation error (400) not 401
        assert response.status_code == 400


@pytest.mark.django_db
class TestLogoutAPI:
    """Tests for POST /api/v1/auth/logout"""

    def setup_method(self):
        self.client = APIClient()
        self.url = '/api/v1/auth/logout/'
        self.user = User.objects.create_user(
            email='logoutuser@example.com',
            password='SecurePass123!',
            first_name='Logout',
            last_name='User',
        )
        self.refresh_token = str(RefreshToken.for_user(self.user))

    def test_logout_success(self):
        """Test successful logout blacklists token."""
        response = self.client.post(
            self.url,
            {'refresh': self.refresh_token},
            format='json'
        )

        assert response.status_code == 204

        # Verify token is blacklisted - instantiation raises TokenError
        with pytest.raises(TokenError):
            RefreshToken(self.refresh_token)

    def test_logout_missing_token(self):
        """Test logout fails when refresh token is missing."""
        response = self.client.post(self.url, {}, format='json')

        assert response.status_code == 400
        assert 'refresh' in response.data

    def test_logout_invalid_token(self):
        """Test logout fails with invalid token."""
        response = self.client.post(
            self.url,
            {'refresh': 'invalid.token.here'},
            format='json'
        )

        assert response.status_code == 400

    def test_logout_already_blacklisted_token(self):
        """Test logout fails with already blacklisted token."""
        # First logout
        self.client.post(self.url, {'refresh': self.refresh_token}, format='json')

        # Second logout with same token
        response = self.client.post(
            self.url,
            {'refresh': self.refresh_token},
            format='json'
        )

        assert response.status_code == 400


@pytest.mark.django_db
class TestMeAPI:
    """Tests for GET /api/v1/auth/me"""

    def setup_method(self):
        self.client = APIClient()
        self.url = '/api/v1/auth/me/'
        self.user = User.objects.create_user(
            email='meuser@example.com',
            password='SecurePass123!',
            first_name='Me',
            last_name='User',
            role=Role.CHARITY,
        )
        self.access_token = str(RefreshToken.for_user(self.user).access_token)

    def test_me_authenticated(self):
        """Test /me returns user data when authenticated."""
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.access_token}')
        response = self.client.get(self.url)

        assert response.status_code == 200
        assert response.data['id'] == self.user.id
        assert response.data['email'] == 'meuser@example.com'
        assert response.data['first_name'] == 'Me'
        assert response.data['last_name'] == 'User'
        assert response.data['full_name'] == 'Me User'
        assert response.data['role'] == Role.CHARITY
        assert response.data['is_active'] is True
        assert 'date_joined' in response.data

    def test_me_unauthenticated(self):
        """Test /me returns 401 when not authenticated."""
        response = self.client.get(self.url)

        assert response.status_code == 401

    def test_me_invalid_token(self):
        """Test /me returns 401 with invalid token."""
        self.client.credentials(HTTP_AUTHORIZATION='Bearer invalid.token.here')
        response = self.client.get(self.url)

        assert response.status_code == 401

    def test_me_expired_token(self):
        """Test /me returns 401 with expired token."""
        # Create an expired access token
        from rest_framework_simplejwt.tokens import AccessToken
        from datetime import timedelta

        token = AccessToken.for_user(self.user)
        # Set exp to past using timedelta
        token.set_exp(lifetime=timedelta(seconds=-1))

        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.get(self.url)

        assert response.status_code == 401

    def test_me_no_sensitive_fields(self):
        """Test /me does not expose sensitive fields."""
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.access_token}')
        response = self.client.get(self.url)

        assert 'password' not in response.data
        assert 'is_staff' not in response.data
        assert 'is_superuser' not in response.data
        assert 'groups' not in response.data
        assert 'user_permissions' not in response.data


@pytest.mark.django_db
class TestAuthIntegration:
    """Integration tests for auth flow."""

    def setup_method(self):
        self.client = APIClient()

    def test_full_auth_flow_register_login_me_logout(self):
        """Test complete auth flow: register -> login -> me -> logout."""
        register_url = '/api/v1/auth/register/'
        login_url = '/api/v1/auth/login/'
        me_url = '/api/v1/auth/me/'
        logout_url = '/api/v1/auth/logout/'
        refresh_url = '/api/v1/auth/refresh/'

        # Register
        reg_data = {
            'email': 'flow@example.com',
            'password': 'SecurePass123!',
            'first_name': 'Flow',
            'last_name': 'User',
        }
        reg_response = self.client.post(register_url, reg_data, format='json')
        assert reg_response.status_code == 201
        access_token = reg_response.data['access']
        refresh_token = reg_response.data['refresh']

        # Access /me with register tokens
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')
        me_response = self.client.get(me_url)
        assert me_response.status_code == 200
        assert me_response.data['email'] == 'flow@example.com'

        # Refresh token
        refresh_response = self.client.post(refresh_url, {'refresh': refresh_token}, format='json')
        assert refresh_response.status_code == 200
        new_access = refresh_response.data['access']
        new_refresh = refresh_response.data.get('refresh')

        # Use new access token
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {new_access}')
        me_response2 = self.client.get(me_url)
        assert me_response2.status_code == 200

        # Logout with new refresh token (if rotation) or original
        logout_token = new_refresh or refresh_token
        logout_response = self.client.post(logout_url, {'refresh': logout_token}, format='json')
        assert logout_response.status_code == 204

        # Verify refresh token is blacklisted - instantiation raises TokenError
        with pytest.raises(TokenError):
            RefreshToken(logout_token)

    def test_login_then_me_then_refresh_then_me(self):
        """Test login -> me -> refresh -> me flow."""
        login_url = '/api/v1/auth/login/'
        me_url = '/api/v1/auth/me/'
        refresh_url = '/api/v1/auth/refresh/'

        user = User.objects.create_user(
            email='integration@example.com',
            password='SecurePass123!',
            first_name='Integration',
            last_name='User',
        )

        # Login
        login_response = self.client.post(
            login_url,
            {'email': 'integration@example.com', 'password': 'SecurePass123!'},
            format='json'
        )
        assert login_response.status_code == 200
        access = login_response.data['access']
        refresh = login_response.data['refresh']

        # /me
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access}')
        me_response = self.client.get(me_url)
        assert me_response.status_code == 200

        # Refresh
        refresh_response = self.client.post(refresh_url, {'refresh': refresh}, format='json')
        assert refresh_response.status_code == 200
        new_access = refresh_response.data['access']

        # /me with new access token
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {new_access}')
        me_response2 = self.client.get(me_url)
        assert me_response2.status_code == 200