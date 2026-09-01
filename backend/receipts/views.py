from django.http import HttpResponse
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
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

    @action(detail=True, methods=['get'])
    def download_pdf(self, request, pk=None):
        """
        Download the official PDF receipt for a successful donation.
        """
        receipt = self.get_object()
        try:
            pdf_bytes = ReceiptService.generate_pdf_bytes(receipt)
            response = HttpResponse(pdf_bytes, content_type='application/pdf')
            filename = f"Receipt_{receipt.receipt_number}.pdf"
            response['Content-Disposition'] = f'attachment; filename="{filename}"'
            return response
        except Exception as e:
            return Response(
                {'detail': f'Error generating PDF receipt: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
