"""
Serializers for authentication API endpoints.

Provides validation and serialization for:
- User registration
- User login
- Token refresh
- User logout
- Current user profile (/me)
"""

from rest_framework import serializers
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError

from users.models import Role, User


class RegisterSerializer(serializers.Serializer):
    """
    Serializer for user registration.

    Validates:
    - email: required, unique, valid email format
    - password: required, passes Django password validators
    - first_name: required
    - last_name: required
    - role: optional, must be valid role (DONOR, CHARITY, VOLUNTEER), not ADMIN
    """

    email = serializers.EmailField(required=True)
    password = serializers.CharField(required=True, write_only=True, min_length=8)
    first_name = serializers.CharField(required=True, max_length=150)
    last_name = serializers.CharField(required=True, max_length=150)
    role = serializers.ChoiceField(
        choices=[Role.DONOR, Role.CHARITY, Role.VOLUNTEER],
        default=Role.DONOR,
        required=False,
    )

    def validate_email(self, value):
        """Check if email is already registered."""
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError(
                "A user with this email already exists."
            )
        # Normalize email: lowercase domain only (Django's normalize_email behavior)
        try:
            email_name, domain_part = value.strip().rsplit("@", 1)
        except ValueError:
            return value
        return email_name + "@" + domain_part.lower()

    def validate_password(self, value):
        """Validate password using Django's password validators."""
        from django.contrib.auth.password_validation import validate_password
        from django.core.exceptions import ValidationError as DjangoValidationError

        try:
            validate_password(value)
        except DjangoValidationError as e:
            raise serializers.ValidationError(list(e.messages))
        return value

    def validate_role(self, value):
        """Prevent normal users from registering as ADMIN."""
        if value == Role.ADMIN:
            raise serializers.ValidationError(
                "Cannot register as admin. Contact system administrator."
            )
        return value

    def create(self, validated_data):
        """Create and return a new user."""
        user = User.objects.create_user(
            email=validated_data['email'],
            password=validated_data['password'],
            first_name=validated_data['first_name'],
            last_name=validated_data['last_name'],
            role=validated_data.get('role', Role.DONOR),
        )
        return user


class LoginSerializer(serializers.Serializer):
    """
    Serializer for user login.

    Validates:
    - email: required
    - password: required

    Returns:
    - access token
    - refresh token
    - user info (id, email, first_name, last_name, role)
    """

    email = serializers.EmailField(required=True)
    password = serializers.CharField(required=True, write_only=True)

    def validate(self, attrs):
        """Authenticate user with email and password."""
        email = attrs.get('email', '').lower()
        password = attrs.get('password')

        if not email or not password:
            raise serializers.ValidationError(
                "Both email and password are required."
            )

        try:
            user = User.objects.get(email__iexact=email)
        except User.DoesNotExist:
            raise serializers.ValidationError(
                "Invalid credentials."
            )

        if not user.check_password(password):
            raise serializers.ValidationError(
                "Invalid credentials."
            )

        if not user.is_active:
            raise serializers.ValidationError(
                "Account is disabled. Contact support."
            )

        attrs['user'] = user
        return attrs

    def get_tokens(self, user):
        """Generate JWT tokens for user."""
        refresh = RefreshToken.for_user(user)
        return {
            'access': str(refresh.access_token),
            'refresh': str(refresh),
        }


class RefreshSerializer(serializers.Serializer):
    """
    Serializer for token refresh.

    Validates:
    - refresh: required refresh token

    Returns:
    - new access token
    - new refresh token (if rotation enabled)
    """

    refresh = serializers.CharField(required=True, write_only=True)

    def validate_refresh(self, value):
        """Validate and return the refresh token."""
        try:
            token = RefreshToken(value)
            # Verify token is valid (checks exp, type, blacklist if enabled)
            token.verify()
            return value
        except TokenError as e:
            raise serializers.ValidationError("Invalid or expired refresh token.")


class LogoutSerializer(serializers.Serializer):
    """
    Serializer for user logout (token blacklisting).

    Validates:
    - refresh: required refresh token to blacklist
    """

    refresh = serializers.CharField(required=True, write_only=True)

    def validate_refresh(self, value):
        """Validate refresh token exists and is not already blacklisted."""
        try:
            token = RefreshToken(value)
            token.check_blacklist()
            return value
        except TokenError:
            raise serializers.ValidationError("Invalid or expired refresh token.")

    def save(self):
        """Blacklist the refresh token."""
        refresh = RefreshToken(self.validated_data['refresh'])
        refresh.blacklist()


class UserSerializer(serializers.ModelSerializer):
    """Serializer for user profile (safe fields only)."""

    full_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'email', 'first_name', 'last_name', 'full_name', 'role', 'is_active', 'date_joined']
        read_only_fields = ['id', 'email', 'role', 'is_active', 'date_joined']

    def get_full_name(self, obj):
        return obj.get_full_name()


class AuthResponseSerializer(serializers.Serializer):
    """
    Standardized response format for auth endpoints.
    """

    user = UserSerializer(read_only=True)
    access = serializers.CharField(read_only=True)
    refresh = serializers.CharField(read_only=True)