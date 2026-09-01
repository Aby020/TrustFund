"""
URL configuration for donations app.
"""
from rest_framework.routers import DefaultRouter
from donations.views import DonationViewSet

router = DefaultRouter()
router.register(r'', DonationViewSet, basename='donation')

urlpatterns = router.urls
