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

    @classmethod
    def fetch_payment(cls, payment_id):
        """
        Fetch a Razorpay payment to confirm its amount, currency, order, and status.

        The Razorpay API is the source of truth for whether money actually moved;
        the client-side signature alone must never be the only confirmation used.
        Returns ``None`` when the gateway cannot be reached (caller keeps the
        donation PENDING rather than guessing).
        """
        client = cls.get_client()
        try:
            return client.payment.fetch(payment_id)
        except Exception as e:
            logger.error(f'Razorpay payment fetch failed: {e}')
            return None


def _mark_failed(donation):
    """Persist FAILED status in its own atomic block so the write survives any subsequent raise."""
    with transaction.atomic():
        donation.status = DonationStatus.FAILED
        donation.save(update_fields=['status', 'updated_at'])


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
    def complete_donation(donation, razorpay_payment_id, razorpay_signature):
        """
        Verify payment and complete donation:
        1. Verify signature and confirm the fetched payment matches the order.
        2. If already SUCCESS (idempotent webhook / retry), return safely.
        3. Update donation status to SUCCESS under a row lock, save payment id & signature.
        4. Atomically increment campaign raised_amount.

        The success transition and the campaign increment are one committed unit;
        a concurrent duplicate verify is serialized by ``select_for_update`` and
        re-checks the status under the lock, so it can never double-credit the
        campaign. Validation failures mark the donation FAILED in their own
        committed transaction (``_mark_failed``) before the error propagates.
        """
        if donation.status == DonationStatus.SUCCESS:
            return donation  # Already completed (idempotent)

        if donation.status != DonationStatus.PENDING:
            raise DjangoValidationError(f'Cannot complete donation in status {donation.status}.')

        # Verify signature (no writes yet).
        is_valid = RazorpayService.verify_signature(
            order_id=donation.razorpay_order_id,
            payment_id=razorpay_payment_id,
            signature=razorpay_signature,
        )
        if not is_valid:
            _mark_failed(donation)
            raise DjangoValidationError('Invalid payment signature.')

        # Confirm against Razorpay that the payment actually matches this order,
        # this amount and this currency. The signature proves the checkout data is
        # genuine; the fetched payment proves the money moved for the right order.
        fetched = RazorpayService.fetch_payment(razorpay_payment_id)
        if fetched is None:
            # Gateway unreachable — keep the donation PENDING so the client or
            # webhook can retry; never mark a donation SUCCESS we cannot verify.
            raise DjangoValidationError('Payment gateway is unavailable. Please try again.')
        expected_paise = int(round(float(donation.amount) * 100))
        if (
            fetched.get('order_id') != donation.razorpay_order_id
            or fetched.get('amount') != expected_paise
            or fetched.get('currency') != donation.currency
            or fetched.get('status') not in ('captured', 'authorized')
        ):
            _mark_failed(donation)
            raise DjangoValidationError('Payment verification failed: amount or order mismatch.')

        # Commit the success transition atomically and under a write lock so a
        # concurrent duplicate verify cannot double-credit the campaign.
        with transaction.atomic():
            locked = Donation.objects.select_for_update().get(pk=donation.pk)
            if locked.status == DonationStatus.SUCCESS:
                return donation
            if locked.status != DonationStatus.PENDING:
                raise DjangoValidationError(f'Cannot complete donation in status {locked.status}.')

            locked.status = DonationStatus.SUCCESS
            locked.razorpay_payment_id = razorpay_payment_id
            locked.razorpay_signature = razorpay_signature
            locked.save(update_fields=['status', 'razorpay_payment_id', 'razorpay_signature', 'updated_at'])

            Campaign.objects.filter(pk=locked.campaign_id).update(
                raised_amount=models.F('raised_amount') + locked.amount
            )
            # Mirror the committed state onto the caller's instance so the
            # serialized response reflects SUCCESS (locked is a different object).
            donation.status = DonationStatus.SUCCESS
            donation.razorpay_payment_id = razorpay_payment_id
            donation.razorpay_signature = razorpay_signature

        return donation

    @staticmethod
    @transaction.atomic
    def handle_webhook_event(event_payload, signature, raw_body):
        """
        Handle Razorpay webhook event (e.g. payment.captured or order.paid).
        Ensure idempotent processing.

        A signed webhook is trusted as coming from Razorpay, but the payload is
        still cross-checked against the donation we created: the order reference,
        the captured amount in paise, and the currency must all match. A payload
        that cannot be matched is logged and ignored (the donation stays PENDING
        so the client verification flow can still complete it legitimately).
        """
        if not RazorpayService.verify_webhook_signature(raw_body, signature):
            raise DjangoValidationError('Invalid webhook signature.')

        event = event_payload.get('event')
        payload_data = event_payload.get('payload', {})

        if event in ['payment.captured', 'order.paid']:
            if event == 'payment.captured':
                entity = payload_data.get('payment', {}).get('entity', {})
                order_id = entity.get('order_id')
                payment_id = entity.get('id')
                captured_amount = entity.get('amount')
                captured_currency = entity.get('currency')
            else:  # order.paid
                entity = payload_data.get('order', {}).get('entity', {})
                order_id = entity.get('id')
                payments = entity.get('payments') or []
                payment_id = payments[0].get('id') if payments else None
                captured_amount = entity.get('amount')
                captured_currency = entity.get('currency')

            if not order_id:
                logger.warning('Webhook event missing order reference.')
                return False

            donation = Donation.objects.select_for_update().filter(razorpay_order_id=order_id).first()
            if not donation:
                logger.warning(f'Donation not found for Razorpay order ID {order_id}')
                return False

            if donation.status == DonationStatus.SUCCESS:
                return True  # Already processed (idempotent)

            if donation.status != DonationStatus.PENDING:
                return False

            # Re-validate the signed payload against the donation we created.
            expected_paise = int(round(float(donation.amount) * 100))
            if (
                captured_amount != expected_paise
                or captured_currency != donation.currency
                or order_id != donation.razorpay_order_id
            ):
                logger.error(
                    'Webhook amount/currency/reference mismatch for donation %s '
                    '(expected %s %s on order %s, webhook sent %s %s on order %s).',
                    donation.id, expected_paise, donation.currency, donation.razorpay_order_id,
                    captured_amount, captured_currency, order_id,
                )
                return False

            donation.status = DonationStatus.SUCCESS
            donation.razorpay_payment_id = payment_id
            donation.save(update_fields=['status', 'razorpay_payment_id', 'updated_at'])

            Campaign.objects.filter(pk=donation.campaign_id).update(
                raised_amount=models.F('raised_amount') + donation.amount
            )
            return True

        return False
