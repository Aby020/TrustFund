from django.contrib import admin
from receipts.models import Receipt


@admin.register(Receipt)
class ReceiptAdmin(admin.ModelAdmin):
    list_display = ('receipt_number', 'donor', 'campaign', 'amount', 'currency', 'donation_date', 'created_at')
    search_fields = ('receipt_number', 'donor__email', 'campaign__title', 'transaction_reference')
    list_filter = ('currency', 'created_at', 'campaign__organization')
    readonly_fields = (
        'receipt_number',
        'donation',
        'donor',
        'campaign',
        'charity_organization',
        'amount',
        'currency',
        'transaction_reference',
        'donation_date',
        'created_at',
    )
    ordering = ('-created_at',)
