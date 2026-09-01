"""
Tests for Donation Receipts domain.
"""
from datetime import date, timedelta
from decimal import Decimal
import pytest
from rest_framework.test import APIClient
from rest_framework import status

from campaigns.models import Campaign, CampaignCategory, CampaignStatus
from charities.models import CharityOrganization, VerificationStatus
from users.models import User, Role
from donations.models import Donation, DonationStatus
from receipts.models import Receipt
from receipts.services import ReceiptService


@pytest.mark.django_db
class TestReceiptViewSet:
    """Test suite for receipt endpoints and generation logic."""

    @pytest.fixture
    def api_client(self):
        return APIClient()

    @pytest.fixture
    def donor_user(self):
        return User.objects.create_user(
            email='receiptdonor@example.com',
            password='SecurePassword123!',
            role=Role.DONOR,
        )

    @pytest.fixture
    def other_donor_user(self):
        return User.objects.create_user(
            email='otherreceiptdonor@example.com',
            password='SecurePassword123!',
            role=Role.DONOR,
        )

    @pytest.fixture
    def verified_charity(self):
        owner = User.objects.create_user(
            email='charityowner_receipt@example.com',
            password='SecurePassword123!',
            role=Role.CHARITY,
        )
        return CharityOrganization.objects.create(
            owner=owner,
            name='Receipt Charity',
            email='rcptcharity@example.com',
            registration_number='REG-RCPT-100',
            description='Charity for receipts.',
            verification_status=VerificationStatus.VERIFIED,
        )

    @pytest.fixture
    def active_campaign(self, verified_charity):
        today = date.today()
        return Campaign.objects.create(
            organization=verified_charity,
            title='Education Fund',
            description='Education for all.',
            category=CampaignCategory.EDUCATION,
            goal_amount=Decimal('5000.00'),
            location='Mombasa',
            start_date=today,
            end_date=today + timedelta(days=30),
            status=CampaignStatus.ACTIVE,
        )

    def test_receipt_created_only_for_successful_donation(self, donor_user, active_campaign):
        # Pending donation should NOT have a receipt
        pending_donation = Donation.objects.create(
            donor=donor_user,
            campaign=active_campaign,
            amount=Decimal('100.00'),
            status=DonationStatus.PENDING,
            razorpay_order_id='order_pending_1',
        )
        assert not Receipt.objects.filter(donation=pending_donation).exists()

        # Failed donation should NOT have a receipt
        failed_donation = Donation.objects.create(
            donor=donor_user,
            campaign=active_campaign,
            amount=Decimal('150.00'),
            status=DonationStatus.FAILED,
            razorpay_order_id='order_failed_1',
        )
        assert not Receipt.objects.filter(donation=failed_donation).exists()

        # Successful donation should AUTOMATICALLY have a receipt created via signal
        success_donation = Donation.objects.create(
            donor=donor_user,
            campaign=active_campaign,
            amount=Decimal('250.00'),
            status=DonationStatus.SUCCESS,
            razorpay_order_id='order_success_1',
            razorpay_payment_id='pay_success_1',
        )
        receipt = Receipt.objects.filter(donation=success_donation).first()
        assert receipt is not None
        assert receipt.amount == Decimal('250.00')
        assert receipt.donor == donor_user
        assert receipt.campaign == active_campaign
        assert receipt.charity_organization == active_campaign.organization
        assert receipt.receipt_number.startswith('TRF-')

    def test_duplicate_receipt_prevention(self, donor_user, active_campaign):
        success_donation = Donation.objects.create(
            donor=donor_user,
            campaign=active_campaign,
            amount=Decimal('500.00'),
            status=DonationStatus.SUCCESS,
            razorpay_order_id='order_dup_test',
        )
        # Calling service create_receipt_for_donation multiple times should return the same receipt
        r1 = ReceiptService.create_receipt_for_donation(success_donation)
        r2 = ReceiptService.create_receipt_for_donation(success_donation)
        assert r1.id == r2.id
        assert Receipt.objects.filter(donation=success_donation).count() == 1

    def test_unique_receipt_numbers(self, donor_user, active_campaign):
        d1 = Donation.objects.create(
            donor=donor_user, campaign=active_campaign, amount=Decimal('10.00'), status=DonationStatus.SUCCESS, razorpay_order_id='ord_1'
        )
        d2 = Donation.objects.create(
            donor=donor_user, campaign=active_campaign, amount=Decimal('20.00'), status=DonationStatus.SUCCESS, razorpay_order_id='ord_2'
        )
        r1 = Receipt.objects.get(donation=d1)
        r2 = Receipt.objects.get(donation=d2)
        assert r1.receipt_number != r2.receipt_number

    def test_donor_ownership_isolation(self, api_client, donor_user, other_donor_user, active_campaign):
        d1 = Donation.objects.create(
            donor=donor_user, campaign=active_campaign, amount=Decimal('100.00'), status=DonationStatus.SUCCESS, razorpay_order_id='ord_iso_1'
        )
        d2 = Donation.objects.create(
            donor=other_donor_user, campaign=active_campaign, amount=Decimal('200.00'), status=DonationStatus.SUCCESS, razorpay_order_id='ord_iso_2'
        )

        r1 = Receipt.objects.get(donation=d1)

        # Donor 1 lists receipts -> should only see r1
        api_client.force_authenticate(user=donor_user)
        response = api_client.get('/api/v1/receipts/')
        assert response.status_code == status.HTTP_200_OK
        results = response.data['results'] if 'results' in response.data else response.data
        assert len(results) == 1
        assert results[0]['id'] == r1.id

        # Donor 1 attempts to retrieve donor 2's receipt -> 404 or 403
        r2 = Receipt.objects.get(donation=d2)
        url = f'/api/v1/receipts/{r2.pk}/'
        res_detail = api_client.get(url)
        assert res_detail.status_code in [status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND]

    def test_pdf_download_endpoint(self, api_client, donor_user, active_campaign):
        donation = Donation.objects.create(
            donor=donor_user,
            campaign=active_campaign,
            amount=Decimal('300.00'),
            status=DonationStatus.SUCCESS,
            razorpay_order_id='ord_pdf_1',
            razorpay_payment_id='pay_pdf_1',
        )
        receipt = Receipt.objects.get(donation=donation)

        api_client.force_authenticate(user=donor_user)
        url = f'/api/v1/receipts/{receipt.pk}/download_pdf/'
        response = api_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response['Content-Type'] == 'application/pdf'
        assert b'%PDF' in response.content
