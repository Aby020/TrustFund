from django.contrib import admin

from admin_api.models import AuditLog


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    """Read-only Django admin view of the audit trail."""
    list_display = ('created_at', 'action', 'actor', 'resource_type', 'resource_label')
    list_filter = ('action', 'resource_type')
    search_fields = ('resource_label', 'detail', 'actor__email')
    date_hierarchy = 'created_at'
    readonly_fields = (
        'actor', 'action', 'resource_type', 'resource_label', 'detail', 'created_at',
    )

    def has_add_permission(self, request):
        return False  # Audit entries are append-only, created by the app.

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False