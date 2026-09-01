from django.db.models.signals import post_save
from django.dispatch import receiver
from donations.models import Donation, DonationStatus
from receipts.services import ReceiptService

@receiver(post_save, sender=Donation)
def create_receipt_on_donation_success(sender, instance, created, **kwargs):
    """
    Automatically create a receipt when a donation status transitions to SUCCESS.
    """
    if instance.status == DonationStatus.SUCCESS:
        ReceiptService.create_receipt_for_donation(instance)
