"""
Django app configuration for charities.
"""
from django.apps import AppConfig


class CharitiesConfig(AppConfig):
    """Configuration for the charities application."""

    default_auto_field = 'django.db.models.BigAutoField'
    name = 'charities'
    verbose_name = 'Charity Organizations'

    def ready(self):
        """Import signal handlers when app is ready."""
        # Signals can be imported here if needed
        pass