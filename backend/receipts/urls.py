from django.urls import path
from .views import ReceiptViewSet
from rest_framework.routers import DefaultRouter

router = DefaultRouter()
router.register(r'', ReceiptViewSet, basename='receipt')

urlpatterns = router.urls
