"""
Django Admin configuration for donations app.
"""
from django.contrib import admin
from donations.models import Donation


@admin.register(Donation)
class DonationAdmin(admin.ModelAdmin):
    """Admin configuration for Donation model."""

    list_display = [
        'id',
        'donor',
        'campaign',
        'amount',
        'currency',
        'status',
        'is_anonymous',
        'created_at',
    ]
    list_filter = ['status', 'currency', 'is_anonymous', 'created_at']
    search_fields = [
        'donor__email',
        'campaign__title',
        'razorpay_order_id',
        'razorpay_payment_id',
    ]
    readonly_fields = [
        'razorpay_order_id',
        'razorpay_payment_id',
        'razorpay_signature',
        'idempotency_key',
        'created_at',
        'updated_at',
    ]
    autocomplete_fields = ['donor', 'campaign']
    ordering = ['-created_at']
    fieldsets = (
        (None, {
            'fields': ('donor', 'campaign', 'amount', 'currency', 'status', 'is_anonymous', 'message')
        }),
        ('Gateway References', {
            'fields': ('razorpay_order_id', 'razorpay_payment_id', 'razorpay_signature', 'idempotency_key')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
