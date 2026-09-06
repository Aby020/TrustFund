"""
URL configuration for the admin API slice.

Mounted at /api/v1/admin/ in the project root urlconf.
"""
from django.urls import path

from admin_api.views import AdminAuditLogListView, AdminUserListView

urlpatterns = [
    path('users/', AdminUserListView.as_view(), name='admin-user-list'),
    path('audit-logs/', AdminAuditLogListView.as_view(), name='admin-audit-log-list'),
]