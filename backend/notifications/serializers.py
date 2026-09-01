"""
Serializers for the notifications domain.
"""
from rest_framework import serializers
from notifications.models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    """Serializer for reading and updating notifications."""

    notification_type_display = serializers.CharField(source='get_notification_type_display', read_only=True)

    class Meta:
        model = Notification
        fields = [
            'id',
            'recipient',
            'notification_type',
            'notification_type_display',
            'title',
            'message',
            'is_read',
            'created_at',
        ]
        read_only_fields = [
            'id',
            'recipient',
            'notification_type',
            'notification_type_display',
            'title',
            'message',
            'created_at',
        ]
