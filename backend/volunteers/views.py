"""
Views and ViewSets for Volunteer Management domain.
"""
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import VolunteerOpportunity, VolunteerApplication, ApplicationStatus
from .serializers import VolunteerOpportunitySerializer, VolunteerApplicationSerializer
from users.models import Role


class IsCharityOwnerOrAdminForOpportunity(permissions.BasePermission):
    """
    Permission to ensure only the charity owner (or admin) can create/update/delete opportunities.
    """
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return request.user and request.user.is_authenticated and (
            request.user.is_staff or request.user.is_superuser or request.user.role in [Role.CHARITY, Role.ADMIN]
        )

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        user = request.user
        if user.is_staff or user.is_superuser or user.role == Role.ADMIN:
            return True
        if user.role == Role.CHARITY and obj.charity_organization.owner == user:
            return True
        return False


class VolunteerOpportunityViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing volunteer opportunities.
    """
    queryset = VolunteerOpportunity.objects.select_related('charity_organization', 'campaign').all()
    serializer_class = VolunteerOpportunitySerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly, IsCharityOwnerOrAdminForOpportunity]

    def perform_create(self, serializer):
        user = self.request.user
        # If charity user, ensure they own the charity organization specified
        if user.role == Role.CHARITY:
            charity = serializer.validated_data.get('charity_organization')
            if charity.owner != user:
                from rest_framework.exceptions import PermissionDenied
                raise PermissionDenied("You can only create opportunities for your own charity organization.")
        serializer.save()


class IsVolunteerApplicantOrCharityOwnerOrAdmin(permissions.BasePermission):
    """
    Permission for volunteer applications:
    - Volunteers can view/create their own applications.
    - Charity owners can view and update application status for their organization's opportunities.
    - Admins can view/manage all.
    """
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated

    def has_object_permission(self, request, view, obj):
        user = request.user
        if user.is_staff or user.is_superuser or user.role == Role.ADMIN:
            return True
        if user.role == Role.DONOR and obj.volunteer == user:
            return True
        if user.role == Role.CHARITY and obj.opportunity.charity_organization.owner == user:
            return True
        return False


class VolunteerApplicationViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing volunteer applications.
    """
    serializer_class = VolunteerApplicationSerializer
    permission_classes = [permissions.IsAuthenticated, IsVolunteerApplicantOrCharityOwnerOrAdmin]

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return VolunteerApplication.objects.none()

        if user.is_staff or user.is_superuser or user.role == Role.ADMIN:
            return VolunteerApplication.objects.select_related('opportunity__charity_organization', 'volunteer').all()
        elif user.role == Role.DONOR:
            return VolunteerApplication.objects.select_related('opportunity__charity_organization', 'volunteer').filter(volunteer=user)
        elif user.role == Role.CHARITY:
            return VolunteerApplication.objects.select_related('opportunity__charity_organization', 'volunteer').filter(opportunity__charity_organization__owner=user)

        return VolunteerApplication.objects.none()

    def perform_create(self, serializer):
        serializer.save(volunteer=self.request.user)

    @action(detail=True, methods=['post'])
    def update_status(self, request, pk=None):
        """
        Charity owner or admin can update application status (e.g. APPROVED, REJECTED, ATTENDED).
        """
        application = self.get_object()
        user = request.user

        # Verify permission to update status
        is_allowed = (
            user.is_staff or user.is_superuser or user.role == Role.ADMIN or
            (user.role == Role.CHARITY and application.opportunity.charity_organization.owner == user)
        )
        if not is_allowed:
            return Response({'detail': 'You do not have permission to update this application status.'}, status=status.HTTP_403_FORBIDDEN)

        new_status = request.data.get('status')
        if new_status not in dict(ApplicationStatus.choices).keys():
            return Response({'detail': 'Invalid status value.'}, status=status.HTTP_400_BAD_REQUEST)

        application.status = new_status
        application.save()
        serializer = self.get_serializer(application)
        return Response(serializer.data, status=status.HTTP_200_OK)
