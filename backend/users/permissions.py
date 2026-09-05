"""
Reusable permission classes for the users app and beyond.
"""
from rest_framework import permissions
from users.models import Role


class IsDonor(permissions.BasePermission):
    """
    Allows access only to users with the DONOR role.
    """
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role == Role.DONOR
