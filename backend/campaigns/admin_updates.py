"""
Django Admin configuration for CampaignUpdate model.
"""
from django.contrib import admin
from campaigns.models import CampaignUpdate


@admin.register(CampaignUpdate)
class CampaignUpdateAdmin(admin.ModelAdmin):
    """Admin configuration for CampaignUpdate model."""

    list_display = [
        'title',
        'campaign',
        'created_by',
        'created_at',
    ]
    list_filter = ['created_at']
    search_fields = ['title', 'content', 'campaign__title', 'created_by__email']
    readonly_fields = ['created_at', 'updated_at']
    autocomplete_fields = ['campaign', 'created_by']
    ordering = ['-created_at']
