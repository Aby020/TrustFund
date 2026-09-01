from rest_framework import serializers
from receipts.models import Receipt


class ReceiptSerializer(serializers.ModelSerializer):
    donor_email = serializers.EmailField(source='donor.email', read_only=True)
    campaign_title = serializers.CharField(source='campaign.title', read_only=True)
    charity_name = serializers.CharField(source='charity_organization.name', read_only=True)

    class Meta:
        model = Receipt
        fields = [
            'id',
            'receipt_number',
            'donation',
            'donor',
            'donor_email',
            'campaign',
            'campaign_title',
            'charity_organization',
            'charity_name',
            'amount',
            'currency',
            'transaction_reference',
            'donation_date',
            'created_at',
        ]
        read_only_fields = fields
