"""
Django Admin configuration for campaigns app.
"""
from django.contrib import admin
from campaigns.models import Campaign


@admin.register(Campaign)
class CampaignAdmin(admin.ModelAdmin):
    """Admin configuration for Campaign model."""

    list_display = [
        'title',
        'organization',
        'category',
        'goal_amount',
        'raised_amount',
        'status',
        'start_date',
        'end_date',
        'created_at',
    ]
    list_filter = ['status', 'category', 'created_at']
    search_fields = ['title', 'description', 'location', 'organization__name']
    readonly_fields = ['raised_amount', 'created_at', 'updated_at']
    autocomplete_fields = ['organization']
    ordering = ['-created_at']
    fieldsets = (
        (None, {
            'fields': ('organization', 'title', 'description', 'category', 'location')
        }),
        ('Financials & Goals', {
            'fields': ('goal_amount', 'raised_amount')
        }),
        ('Schedule & Status', {
            'fields': ('start_date', 'end_date', 'status')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
