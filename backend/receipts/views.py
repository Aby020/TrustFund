from django.http import HttpResponse
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.renderers import BaseRenderer
from rest_framework.response import Response

from receipts.models import Receipt
from receipts.serializers import ReceiptSerializer
from receipts.services import ReceiptService
from users.models import Role


class IsReceiptOwnerOrCharityOwnerOrAdmin(permissions.BasePermission):
    """
    Object-level permission:
    - Donors can view their own receipts.
    - Charity owners can view receipts for campaigns belonging to their organizations.
    - Admins / staff can view all receipts.
    """
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated

    def has_object_permission(self, request, view, obj):
        user = request.user
        if user.is_staff or user.is_superuser or user.role == Role.ADMIN:
            return True
        if user.role == Role.DONOR and obj.donor == user:
            return True
        if user.role == Role.CHARITY and obj.campaign.organization.owner == user:
            return True
        return False


class PDFRenderer(BaseRenderer):
    """Renderer that makes an ``Accept: application/pdf`` request negotiable.

    DRF matches the request's Accept header against the endpoint's renderer
    classes in ``initial()``, before the handler runs. Without a renderer that
    reports ``application/pdf``, the browser's explicit ``Accept:
    application/pdf`` is rejected with 406 and the download action never runs.

    ``download_pdf`` returns a ready-to-send ``HttpResponse``, so ``render()``
    is never actually invoked — the renderer is only required for negotiation.
    """

    media_type = 'application/pdf'
    format = 'pdf'

    def render(self, data, media_type=None, renderer_context=None):
        return data


class ReceiptViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for viewing and downloading donation receipts.
    Read-only (no manual creation/modification by users).
    """
    serializer_class = ReceiptSerializer
    permission_classes = [permissions.IsAuthenticated, IsReceiptOwnerOrCharityOwnerOrAdmin]

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return Receipt.objects.none()

        if user.is_staff or user.is_superuser or user.role == Role.ADMIN:
            return Receipt.objects.select_related('donor', 'campaign', 'charity_organization', 'donation').all()
        elif user.role == Role.DONOR:
            return Receipt.objects.select_related('donor', 'campaign', 'charity_organization', 'donation').filter(donor=user)
        elif user.role == Role.CHARITY:
            return Receipt.objects.select_related('donor', 'campaign', 'charity_organization', 'donation').filter(campaign__organization__owner=user)

        return Receipt.objects.none()

    @action(detail=True, methods=['get'], renderer_classes=[PDFRenderer])
    def download_pdf(self, request, pk=None):
        """
        Download the official PDF receipt for a successful donation.
        """
        receipt = self.get_object()
        try:
            pdf_bytes = ReceiptService.generate_pdf_bytes(receipt)
            response = HttpResponse(pdf_bytes, content_type='application/pdf')
            filename = f"TrustFund-Receipt-{receipt.receipt_number}.pdf"
            response['Content-Disposition'] = f'attachment; filename="{filename}"'
            return response
        except Exception as e:
            return Response(
                {'detail': f'Error generating PDF receipt: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
