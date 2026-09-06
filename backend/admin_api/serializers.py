"""
Serializers for the admin API slice.
"""
from rest_framework import serializers

from users.models import User
from admin_api.models import AuditLog


class AdminUserSerializer(serializers.ModelSerializer):
    """Admin-visible user info — superset of the profile shape."""
    full_name = serializers.SerializerMethodField()
    role_display = serializers.CharField(source='get_role_display', read_only=True)

    class Meta:
        model = User
        fields = [
            'id',
            'email',
            'first_name',
            'last_name',
            'full_name',
            'role',
            'role_display',
            'is_active',
            'date_joined',
        ]
        read_only_fields = fields

    def get_full_name(self, obj):
        return obj.get_full_name()


class AuditLogSerializer(serializers.ModelSerializer):
    """Read-only serialization of an audit entry with actor name."""
    actor_name = serializers.SerializerMethodField()
    action_display = serializers.CharField(source='get_action_display', read_only=True)

    class Meta:
        model = AuditLog
        fields = [
            'id',
            'actor',
            'actor_name',
            'action',
            'action_display',
            'resource_type',
            'resource_label',
            'detail',
            'created_at',
        ]
        read_only_fields = fields

    def get_actor_name(self, obj):
        if obj.actor:
            return obj.actor.get_full_name()
        return None