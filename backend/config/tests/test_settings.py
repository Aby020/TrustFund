"""
Settings regression tests.

Guards the Cloudinary production media-storage gate: the switch must default to
disabling Cloudinary so the local dev/test environment (and its filesystem-based
image tests) is never routed to a storage backend that requires remote
credentials. When the flag later flips on in production, only ``STORAGES``
changes and the serializer-level image validation is untouched.
"""

from django.conf import settings


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