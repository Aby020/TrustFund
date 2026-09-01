from django.apps import AppConfig


class ReceiptsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'receipts'

    def ready(self):
        import receipts.signals  # noqa
