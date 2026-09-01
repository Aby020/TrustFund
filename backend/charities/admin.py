"""
Django admin configuration for CharityOrganization and VerificationLog.
"""
from django.contrib import admin
from django.utils.translation import gettext_lazy as _

from charities.models import CharityOrganization, VerificationStatus, VerificationLog, VerificationAction


@admin.register(CharityOrganization)
class CharityOrganizationAdmin(admin.ModelAdmin):
    """Admin interface for CharityOrganization."""

    list_display = [
        'name',
        'owner',
        'email',
        'city',
        'country',
        'verification_status',
        'submitted_at',
        'reviewed_at',
        'reviewed_by',
        'created_at',
    ]
    list_filter = [
        'verification_status',
        'country',
        'created_at',
        'submitted_at',
        'reviewed_at',
    ]
    search_fields = [
        'name',
        'email',
        'registration_number',
        'owner__email',
        'owner__first_name',
        'owner__last_name',
        'city',
        'state',
        'rejection_reason',
    ]
    readonly_fields = [
        'created_at',
        'updated_at',
        'verified_at',
        'submitted_at',
        'reviewed_at',
        'reviewed_by',
    ]
    fieldsets = (
        (_('Ownership'), {
            'fields': ('owner',),
        }),
        (_('Organization Details'), {
            'fields': (
                'name',
                'description',
                'registration_number',
            ),
        }),
        (_('Contact Information'), {
            'fields': (
                'email',
                'phone',
                'website',
            ),
        }),
        (_('Address'), {
            'fields': (
                'address',
                'city',
                'state',
                'country',
            ),
        }),
        (_('Verification'), {
            'fields': (
                'verification_status',
                'submitted_at',
                'reviewed_at',
                'reviewed_by',
                'verified_at',
                'rejection_reason',
            ),
        }),
        (_('Timestamps'), {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',),
        }),
    )
    raw_id_fields = ['owner', 'reviewed_by']
    ordering = ['-created_at']
    list_per_page = 25

    def get_queryset(self, request):
        """Optimize queryset with select_related."""
        return super().get_queryset(request).select_related('owner', 'reviewed_by')


@admin.register(VerificationLog)
class VerificationLogAdmin(admin.ModelAdmin):
    """Admin interface for VerificationLog (audit trail)."""

    list_display = [
        'organization',
        'action',
        'performed_by',
        'from_status',
        'to_status',
        'created_at',
    ]
    list_filter = [
        'action',
        'from_status',
        'to_status',
        'created_at',
    ]
    search_fields = [
        'organization__name',
        'performed_by__email',
        'performed_by__first_name',
        'performed_by__last_name',
        'reason',
    ]
    readonly_fields = [
        'organization',
        'action',
        'performed_by',
        'from_status',
        'to_status',
        'reason',
        'created_at',
    ]
    raw_id_fields = ['organization', 'performed_by']
    ordering = ['-created_at']
    list_per_page = 25

    def has_add_permission(self, request):
        """Verification logs are created automatically."""
        return False

    def has_change_permission(self, request, obj=None):
        """Verification logs are immutable."""
        return False

    def get_queryset(self, request):
        """Optimize queryset with select_related."""
        return super().get_queryset(request).select_related('organization', 'performed_by')