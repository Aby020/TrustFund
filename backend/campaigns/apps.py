"""
Django app configuration for campaigns.
"""
from django.apps import AppConfig


class CampaignsConfig(AppConfig):
    """Configuration for the campaigns application."""

    default_auto_field = 'django.db.models.BigAutoField'
    name = 'campaigns'
    verbose_name = 'Campaigns'

    def ready(self):
        """Import signal handlers when app is ready."""
        pass