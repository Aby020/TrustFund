"""
Settings regression tests.

Guards the Cloudinary production media-storage gate: the switch must default to
disabling Cloudinary so the local dev/test environment (and its filesystem-based
image tests) is never routed to a storage backend that requires remote
credentials. When the flag later flips on in production, only ``STORAGES``
changes and the serializer-level image validation is untouched.
"""

from django.conf import settings

from config.settings import configure_email


def test_cloudinary_storage_disabled_by_default():
    """Without CLOUDINARY_STORAGE_ENABLED, media uses the local filesystem."""
    assert settings.CLOUDINARY_STORAGE_ENABLED is False
    assert (
        settings.STORAGES['default']['BACKEND']
        == 'django.core.files.storage.FileSystemStorage'
    )


def test_cloudinary_storage_not_registered_as_app():
    """The cloudinary_storage app is not installed, so its collectstatic
    override never repurposes statics (WhiteNoise owns static files)."""
    assert 'cloudinary_storage' not in settings.INSTALLED_APPS


def test_cloudinary_credentials_unset_in_dev():
    """Local dev carries no Cloudinary credentials (env-only; never defaults)."""
    assert settings.CLOUDINARY_CLOUD_NAME == ''
    assert settings.CLOUDINARY_API_KEY == ''
    assert settings.CLOUDINARY_API_SECRET == ''


def test_staticfiles_storage_is_default_in_dev():
    """Static files keep Django's standard backend here (WhiteNoise is added
    for production in the Render preparation phase)."""
    assert (
        settings.STORAGES['staticfiles']['BACKEND']
        == 'django.contrib.staticfiles.storage.StaticFilesStorage'
    )


# --- EMAIL_URL handling -----------------------------------------------------
#
# django-environ 0.11 renamed the console email scheme to ``consolemail``, so a
# legacy ``console://`` value (or an absent EMAIL_URL) must never be fed through
# env.email(), which would raise ImproperlyConfigured and crash startup. The
# configure_email() helper owns that decision; these tests pin it down.

def test_email_url_absent_falls_back_to_console():
    """With no EMAIL_URL, Django starts on the console backend (no crash)."""
    config = configure_email('')
    assert config == {
        'EMAIL_BACKEND': 'django.core.mail.backends.console.EmailBackend'
    }


def test_email_url_smtp_configures_smtp_backend():
    """A valid SMTP EMAIL_URL is parsed into real EMAIL_* settings."""
    config = configure_email('smtps://user:pass@mail.example.com:587')
    assert config['EMAIL_BACKEND'] == 'django.core.mail.backends.smtp.EmailBackend'
    assert config['EMAIL_HOST'] == 'mail.example.com'
    assert config['EMAIL_PORT'] == 587
    assert config['EMAIL_HOST_USER'] == 'user'
    assert config['EMAIL_HOST_PASSWORD'] == 'pass'
    assert config['EMAIL_USE_TLS'] is True


def test_email_url_legacy_console_scheme_does_not_crash():
    """A legacy 'console://' value must not fail startup — fall back to console."""
    config = configure_email('console://')
    assert config == {
        'EMAIL_BACKEND': 'django.core.mail.backends.console.EmailBackend'
    }


def test_email_backend_resolves_without_crashing():
    """The real settings module resolves a concrete EMAIL_BACKEND in this
    environment (absent or legacy value), never an ImproperlyConfigured.

    pytest-django forces ``locmem`` in the test env, so we accept any of the
    known backends — the point is that startup no longer raises.
    """
    assert settings.EMAIL_BACKEND in {
        'django.core.mail.backends.console.EmailBackend',
        'django.core.mail.backends.smtp.EmailBackend',
        'django.core.mail.backends.locmem.EmailBackend',
    }