"""
Django admin configuration for CharityOrganization.
"""
from django.contrib import admin
from django.utils.translation import gettext_lazy as _

from charities.models import CharityOrganization, VerificationStatus


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
        'created_at',
    ]
    list_filter = [
        'verification_status',
        'country',
        'created_at',
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
    ]
    readonly_fields = [
        'created_at',
        'updated_at',
        'verified_at',
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
                'verified_at',
                'rejection_reason',
            ),
        }),
        (_('Timestamps'), {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',),
        }),
    )
    raw_id_fields = ['owner']
    ordering = ['-created_at']
    list_per_page = 25

    def get_queryset(self, request):
        """Optimize queryset with select_related."""
        return super().get_queryset(request).select_related('owner')