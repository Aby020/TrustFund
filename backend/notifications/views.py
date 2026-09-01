"""
Views for notifications management.
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import PermissionDenied

from notifications.models import Notification
from notifications.serializers import NotificationSerializer


class NotificationViewSet(viewsets.ModelViewSet):
    """
    ViewSet for user notifications.
    Users can only list, retrieve, and update (mark as read) their own notifications.
    """
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ['get', 'post', 'patch', 'head', 'options']

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return Notification.objects.none()
        return Notification.objects.filter(recipient=user)

    def perform_update(self, serializer):
        notification = self.get_object()
        if notification.recipient != self.request.user:
            raise PermissionDenied('You can only update your own notifications.')
        serializer.save()

    @action(detail=True, methods=['post', 'patch'])
    def mark_read(self, request, pk=None):
        """Mark a single notification as read."""
        notification = self.get_object()
        if notification.recipient != request.user:
            raise PermissionDenied('You can only modify your own notifications.')
        notification.is_read = True
        notification.save(update_fields=['is_read'])
        serializer = self.get_serializer(notification)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'])
    def mark_all_read(self, request):
        """Mark all notifications for the current user as read."""
        user = request.user
        updated_count = Notification.objects.filter(recipient=user, is_read=False).update(is_read=True)
        return Response({'status': 'success', 'updated_count': updated_count}, status=status.HTTP_200_OK)
