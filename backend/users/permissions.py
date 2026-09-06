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


class IsAdmin(permissions.BasePermission):
    """
    Allows access only to authenticated ADMIN-role (or superuser) users.
    Denies donors, charities, and volunteers at the API boundary.
    """
    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.is_admin_user()
        )
