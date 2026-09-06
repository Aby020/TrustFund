"""
Views for the admin API slice — platform-wide reads, strictly ADMIN-only.

Both endpoints enforce `IsAdmin` at the permission boundary (not via queryset
filtering alone), so donors, charities, and volunteers are rejected with 403
before any data is serialized.
"""
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, generics
from rest_framework.pagination import PageNumberPagination

from admin_api.models import AuditLog
from admin_api.serializers import AdminUserSerializer, AuditLogSerializer
from users.models import User
from users.permissions import IsAdmin


class AdminUserListView(generics.ListAPIView):
    """
    GET /api/v1/admin/users/

    List every platform user for administrators, with search, role/active
    filters, and ordering. Paginated (default DRF page size).
    """
    permission_classes = [IsAdmin]
    serializer_class = AdminUserSerializer
    queryset = User.objects.all().order_by('-date_joined')
    pagination_class = PageNumberPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['role', 'is_active']
    search_fields = ['email', 'first_name', 'last_name']
    ordering_fields = ['date_joined', 'email', 'role']
    ordering = ['-date_joined']


class AdminAuditLogListView(generics.ListAPIView):
    """
    GET /api/v1/admin/audit-logs/

    List the platform audit trail for administrators, with action/resource
    filters and ordering. Paginated.
    """
    permission_classes = [IsAdmin]
    serializer_class = AuditLogSerializer
    queryset = AuditLog.objects.select_related('actor').all().order_by('-created_at')
    pagination_class = PageNumberPagination
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter, filters.SearchFilter]
    filterset_fields = ['action', 'resource_type']
    search_fields = ['resource_label', 'detail']
    ordering_fields = ['created_at']
    ordering = ['-created_at']