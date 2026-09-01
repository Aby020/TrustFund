"""
Payment gateway service for Razorpay integration in TrustFund.
"""
import logging
import razorpay
from django.conf import settings
from django.db import transaction, models
from django.core.exceptions import ValidationError as DjangoValidationError
from donations.models import Donation, DonationStatus
from campaigns.models import Campaign, CampaignStatus

logger = logging.getLogger(__name__)


class RazorpayService:
    """Encapsulates interaction with the Razorpay payment gateway SDK."""

    @staticmethod
    def get_client():
        return razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))

    @classmethod
    def create_order(cls, amount, currency='INR', receipt=None, notes=None):
        """
        Create a Razorpay order for the given amount.
        Amount should be passed in decimal or float, and converted to paisa (paise) integer.
        """
        client = cls.get_client()
        # Razorpay expects amount in lowest currency unit (paise for INR)
        amount_in_paise = int(round(float(amount) * 100))
        data = {
            'amount': amount_in_paise,
            'currency': currency,
            'receipt': receipt or f'rcpt_{Campaign.objects.make_random_password(length=10)}',
            'notes': notes or {},
        }
        try:
            order = client.order.create(data=data)
            return order
        except Exception as e:
            logger.error(f'Razorpay order creation failed: {e}')
            raise DjangoValidationError(f'Payment gateway error: {str(e)}')

    @classmethod
    def verify_signature(cls, order_id, payment_id, signature):
        """
        Verify payment signature returned by Razorpay checkout.
        """
        client = cls.get_client()
        params = {
            'razorpay_order_id': order_id,
            'razorpay_payment_id': payment_id,
            'razorpay_signature': signature,
        }
        try:
            client.utility.verify_payment_signature(params)
            return True
        except razorpay.errors.SignatureVerificationError:
            return False
        except Exception as e:
            logger.error(f'Razorpay signature verification error: {e}')
            return False

    @classmethod
    def verify_webhook_signature(cls, request_body, signature, webhook_secret=None):
        """
        Verify incoming Razorpay webhook signature.
        """
        client = cls.get_client()
        secret = webhook_secret or settings.RAZORPAY_WEBHOOK_SECRET
        try:
            client.utility.verify_webhook_signature(request_body, signature, secret)
            return True
        except Exception as e:
            logger.error(f'Webhook signature verification failed: {e}')
            return False


class DonationService:
    """Service handling business logic for donations and campaign fundraising updates."""

    @staticmethod
    @transaction.atomic
    def initiate_donation(donor, campaign, amount, currency='INR', is_anonymous=False, message='', idempotency_key=None):
        """
        Initiate a donation:
        1. Check if idempotency key exists (return existing pending/success donation if duplicate).
        2. Validate campaign is active.
        3. Create Razorpay order.
        4. Create Donation record with PENDING status.
        """
        if idempotency_key:
            existing = Donation.objects.filter(idempotency_key=idempotency_key).first()
            if existing:
                return existing

        if campaign.status != CampaignStatus.ACTIVE:
            raise DjangoValidationError('Cannot donate to a campaign that is not active.')

        # Create Razorpay order
        receipt_str = f'camp_{campaign.id}_donor_{donor.id}'
        order = RazorpayService.create_order(
            amount=amount,
            currency=currency,
            receipt=receipt_str,
            notes={'campaign_id': str(campaign.id), 'donor_id': str(donor.id)}
        )

        razorpay_order_id = order.get('id')

        donation = Donation.objects.create(
            donor=donor,
            campaign=campaign,
            amount=amount,
            currency=currency,
            status=DonationStatus.PENDING,
            razorpay_order_id=razorpay_order_id,
            idempotency_key=idempotency_key,
            is_anonymous=is_anonymous,
            message=message,
        )
        return donation

    @staticmethod
    @transaction.atomic
    def complete_donation(donation, razorpay_payment_id, razorpay_signature):
        """
        Verify payment and complete donation:
        1. Verify signature.
        2. If already SUCCESS (idempotent webhook / retry), return safely.
        3. Update donation status to SUCCESS, save payment id & signature.
        4. Atomically increment campaign raised_amount.
        """
        if donation.status == DonationStatus.SUCCESS:
            return donation  # Already completed (idempotent)

        if donation.status != DonationStatus.PENDING:
            raise DjangoValidationError(f'Cannot complete donation in status {donation.status}.')

        # Verify signature
        is_valid = RazorpayService.verify_signature(
            order_id=donation.razorpay_order_id,
            payment_id=razorpay_payment_id,
            signature=razorpay_signature,
        )
        if not is_valid:
            donation.status = DonationStatus.FAILED
            donation.save(update_fields=['status', 'updated_at'])
            raise DjangoValidationError('Invalid payment signature.')

        # Update donation
        donation.status = DonationStatus.SUCCESS
        donation.razorpay_payment_id = razorpay_payment_id
        donation.razorpay_signature = razorpay_signature
        donation.save(update_fields=['status', 'razorpay_payment_id', 'razorpay_signature', 'updated_at'])

        # Atomically update campaign raised amount using F() expression
        Campaign.objects.filter(pk=donation.campaign_id).update(
            raised_amount=models.F('raised_amount') + donation.amount
        )

        return donation

    @staticmethod
    @transaction.atomic
    def handle_webhook_event(event_payload, signature, raw_body):
        """
        Handle Razorpay webhook event (e.g. payment.captured or order.paid).
        Ensure idempotent processing.
        """
        if not RazorpayService.verify_webhook_signature(raw_body, signature):
            raise DjangoValidationError('Invalid webhook signature.')

        event = event_payload.get('event')
        payload_data = event_payload.get('payload', {})

        if event in ['payment.captured', 'order.paid']:
            entity = payload_data.get('payment', {}).get('entity') or payload_data.get('order', {}).get('entity', {})
            order_id = entity.get('order_id') or entity.get('id')
            payment_id = entity.get('id') if event == 'payment.captured' else entity.get('payments', [{}])[0].get('id')

            if not order_id:
                logger.warning('Webhook event missing order reference.')
                return False

            donation = Donation.objects.select_for_update().filter(razorpay_order_id=order_id).first()
            if not donation:
                logger.warning(f'Donation not found for Razorpay order ID {order_id}')
                return False

            if donation.status == DonationStatus.SUCCESS:
                return True  # Already processed (idempotent)

            if donation.status == DonationStatus.PENDING:
                # If we have payment_id, we can complete it
                payment_id = entity.get('id', 'pay_webhook_simulated')
                signature = entity.get('signature', 'sig_webhook_simulated')
                donation.status = DonationStatus.SUCCESS
                donation.razorpay_payment_id = payment_id
                donation.save(update_fields=['status', 'razorpay_payment_id', 'updated_at'])

                Campaign.objects.filter(pk=donation.campaign_id).update(
                    raised_amount=models.F('raised_amount') + donation.amount
                )
                return True

        return False
