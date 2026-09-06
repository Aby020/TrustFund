"""
Views for authentication API endpoints.

Provides:
- POST /api/v1/auth/register - User registration
- POST /api/v1/auth/login - User login
- POST /api/v1/auth/refresh - Token refresh
- POST /api/v1/auth/logout - User logout (token blacklist)
- GET /api/v1/auth/me - Current user profile
"""

from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.throttling import ScopedRateThrottle
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError

from users.serializers import (
    RegisterSerializer,
    LoginSerializer,
    RefreshSerializer,
    LogoutSerializer,
    UserSerializer,
    AuthResponseSerializer,
)


class RegisterView(APIView):
    """
    POST /api/v1/auth/register

    Register a new user.

    Request body:
    {
        "email": "user@example.com",
        "password": "SecurePass123!",
        "first_name": "John",
        "last_name": "Doe",
        "role": "DONOR"  // optional, defaults to DONOR
    }

    Response 201:
    {
        "user": {...},
        "access": "eyJ...",
        "refresh": "eyJ..."
    }
    """

    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'auth'

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        # Generate tokens for the new user
        from rest_framework_simplejwt.tokens import RefreshToken
        refresh = RefreshToken.for_user(user)

        response_data = {
            'user': UserSerializer(user).data,
            'access': str(refresh.access_token),
            'refresh': str(refresh),
        }

        return Response(response_data, status=status.HTTP_201_CREATED)


class LoginView(APIView):
    """
    POST /api/v1/auth/login

    Authenticate user and return JWT tokens.

    Request body:
    {
        "email": "user@example.com",
        "password": "SecurePass123!"
    }

    Response 200:
    {
        "user": {...},
        "access": "eyJ...",
        "refresh": "eyJ..."
    }
    """

    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'auth'

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']

        tokens = serializer.get_tokens(user)

        response_data = {
            'user': UserSerializer(user).data,
            'access': tokens['access'],
            'refresh': tokens['refresh'],
        }

        return Response(response_data, status=status.HTTP_200_OK)


class RefreshView(APIView):
    """
    POST /api/v1/auth/refresh

    Refresh access token using refresh token.

    Request body:
    {
        "refresh": "eyJ..."
    }

    Response 200:
    {
        "access": "eyJ...",
        "refresh": "eyJ..."  // new refresh token if rotation enabled
    }
    """

    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'auth'

    def post(self, request):
        serializer = RefreshSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            refresh_token = serializer.validated_data['refresh']
            refresh = RefreshToken(refresh_token)

            # Get new access token
            access_token = str(refresh.access_token)

            response_data = {
                'access': access_token,
            }

            # Handle token rotation if enabled
            from django.conf import settings
            if getattr(settings, 'SIMPLE_JWT', {}).get('ROTATE_REFRESH_TOKENS', True):
                if getattr(settings, 'SIMPLE_JWT', {}).get('BLACKLIST_AFTER_ROTATION', True):
                    # Blacklist the old refresh token
                    refresh.blacklist()

                # Create new refresh token with new jti, exp, iat
                refresh.set_jti()
                refresh.set_exp()
                refresh.set_iat()
                refresh.outstand()

                response_data['refresh'] = str(refresh)

            return Response(response_data, status=status.HTTP_200_OK)

        except TokenError as e:
            return Response(
                {'detail': 'Invalid or expired refresh token.'},
                status=status.HTTP_401_UNAUTHORIZED,
            )


class LogoutView(APIView):
    """
    POST /api/v1/auth/logout

    Blacklist refresh token to logout user.

    Request body:
    {
        "refresh": "eyJ..."
    }

    Response 204: No content
    """

    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'auth'

    def post(self, request):
        serializer = LogoutSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response(status=status.HTTP_204_NO_CONTENT)


class MeView(APIView):
    """
    GET /api/v1/auth/me

    Get current authenticated user profile.

    Requires Authorization: Bearer <access_token>

    Response 200:
    {
        "id": 1,
        "email": "user@example.com",
        "first_name": "John",
        "last_name": "Doe",
        "full_name": "John Doe",
        "role": "DONOR",
        "is_active": true,
        "date_joined": "2024-01-15T10:30:00.000000Z"
    }
    """

    permission_classes = [IsAuthenticated]
    authentication_classes = [JWTAuthentication]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data, status=status.HTTP_200_OK)