from django.db import models
from donations.models import Donation
from users.models import User
from campaigns.models import Campaign
from charities.models import CharityOrganization

class Receipt(models.Model):
    receipt_number = models.CharField(max_length=50, unique=True, editable=False)
    donation = models.OneToOneField(Donation, on_delete=models.CASCADE, related_name='receipt')
    donor = models.ForeignKey(User, on_delete=models.CASCADE, related_name='receipts')
    campaign = models.ForeignKey(Campaign, on_delete=models.CASCADE, related_name='receipts')
    charity_organization = models.ForeignKey(CharityOrganization, on_delete=models.CASCADE, related_name='receipts')

    amount = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(max_length=3, default='INR')
    transaction_reference = models.CharField(max_length=100, blank=True, null=True)
    donation_date = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['receipt_number']),
            models.Index(fields=['created_at']),
        ]

    def __str__(self):
        return f"Receipt {self.receipt_number} for Donation {self.donation.id}"

    @classmethod
    def generate_receipt_number(cls):
        import uuid
        from datetime import datetime
        date_str = datetime.now().strftime('%Y%m%d')
        unique_suffix = uuid.uuid4().hex[:6].upper()
        return f"TRF-{date_str}-{unique_suffix}"

    def save(self, *args, **kwargs):
        if not self.receipt_number:
            self.receipt_number = self.generate_receipt_number()
        super().save(*args, **kwargs)
