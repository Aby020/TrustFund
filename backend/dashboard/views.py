"""
Views for dashboards and analytics endpoints.
"""
from decimal import Decimal
from django.db import models
from django.db.models import Sum, Count, Avg, Q
from django.utils import timezone
from rest_framework import views, status, permissions
from rest_framework.response import Response

from campaigns.models import Campaign, CampaignStatus
from donations.models import Donation, DonationStatus
from charities.models import CharityOrganization, VerificationStatus
from volunteers.models import VolunteerOpportunity, VolunteerApplication, ApplicationStatus
from receipts.models import Receipt


class DonorDashboardView(views.APIView):
    """
    Dashboard API for Donors.
    Provides total donated, campaigns supported, total tax receipts, and recent donations/notifications.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        donations = Donation.objects.filter(donor=user, status=DonationStatus.SUCCESS)

        total_donated = donations.aggregate(total=Sum('amount'))['total'] or 0
        total_donated = Decimal(total_donated).quantize(Decimal('0.01'))
        campaigns_supported = donations.values('campaign').distinct().count()
        total_receipts = Receipt.objects.filter(donor=user).count()

        recent_donations = donations.select_related('campaign', 'campaign__organization').order_by('-created_at')[:5]
        donations_data = [{
            'id': d.id,
            'campaign_title': d.campaign.title,
            'organization_name': d.campaign.organization.name,
            'amount': str(d.amount),
            'created_at': d.created_at,
        } for d in recent_donations]

        return Response({
            'total_donated': str(total_donated),
            'campaigns_supported': campaigns_supported,
            'total_receipts': total_receipts,
            'recent_donations': donations_data,
        }, status=status.HTTP_200_OK)


class CharityDashboardView(views.APIView):
    """
    Dashboard API for Charity Owners.
    Provides organization details, campaigns count, total funds raised, volunteer stats, and recent donations.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        if not user.is_charity() or not hasattr(user, 'charity_organization'):
            return Response({'error': 'User does not own a charity organization.'}, status=status.HTTP_403_FORBIDDEN)

        org = user.charity_organization
        campaigns = Campaign.objects.filter(organization=org)
        campaigns_count = campaigns.count()
        active_campaigns_count = campaigns.filter(status=CampaignStatus.ACTIVE).count()

        total_raised = campaigns.aggregate(total=Sum('raised_amount'))['total'] or 0
        total_raised = Decimal(total_raised).quantize(Decimal('0.01'))

        recent_donations = Donation.objects.filter(
            campaign__organization=org,
            status=DonationStatus.SUCCESS
        ).select_related('campaign', 'donor').order_by('-created_at')[:5]

        donations_data = [{
            'id': d.id,
            'campaign_title': d.campaign.title,
            'donor_name': d.donor.get_full_name() if d.donor else 'Anonymous',
            'amount': str(d.amount),
            'created_at': d.created_at,
        } for d in recent_donations]

        return Response({
            'organization': {
                'id': org.id,
                'name': org.name,
                'verification_status': org.verification_status,
                'is_verified': org.is_verified,
            },
            'campaigns_count': campaigns_count,
            'active_campaigns_count': active_campaigns_count,
            'total_raised': str(total_raised),
            'recent_donations': donations_data,
        }, status=status.HTTP_200_OK)


class AdminDashboardView(views.APIView):
    """
    Dashboard API for System Administrators.
    Provides system-wide metrics: total users, verified charities, active campaigns, total donations raised.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        if not user.is_admin_user():
            return Response({'error': 'Admin access required.'}, status=status.HTTP_403_FORBIDDEN)

        from django.contrib.auth import get_user_model
        User = get_user_model()

        total_users = User.objects.count()
        total_charities = CharityOrganization.objects.count()
        verified_charities = CharityOrganization.objects.filter(verification_status=VerificationStatus.VERIFIED).count()
        total_campaigns = Campaign.objects.count()
        active_campaigns = Campaign.objects.filter(status=CampaignStatus.ACTIVE).count()

        total_raised = Donation.objects.filter(status=DonationStatus.SUCCESS).aggregate(total=Sum('amount'))['total'] or 0
        total_raised = Decimal(total_raised).quantize(Decimal('0.01'))

        return Response({
            'total_users': total_users,
            'total_charities': total_charities,
            'verified_charities': verified_charities,
            'total_campaigns': total_campaigns,
            'active_campaigns': active_campaigns,
            'total_raised': str(total_raised),
        }, status=status.HTTP_200_OK)


class AnalyticsView(views.APIView):
    """
    Analytics API for system statistics.
    Provides donations over time, donations by category, and campaign success rates.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        # Donations by category
        donations_by_category = Donation.objects.filter(
            status=DonationStatus.SUCCESS
        ).values('campaign__category').annotate(
            total_amount=Sum('amount'),
            donation_count=Count('id')
        ).order_by('-total_amount')

        category_data = [{
            'category': item['campaign__category'],
            'total_amount': str(Decimal(item['total_amount'] or 0).quantize(Decimal('0.01'))),
            'donation_count': item['donation_count'],
        } for item in donations_by_category if item['campaign__category']]

        # Campaign success rates (raised >= goal vs total completed/expired campaigns)
        total_campaigns = Campaign.objects.count()
        successful_campaigns = Campaign.objects.filter(raised_amount__gte=models.F('goal_amount')).count()

        success_rate = (successful_campaigns / total_campaigns * 100) if total_campaigns > 0 else 0

        return Response({
            'donations_by_category': category_data,
            'total_campaigns': total_campaigns,
            'successful_campaigns': successful_campaigns,
            'success_rate_percentage': round(success_rate, 2),
        }, status=status.HTTP_200_OK)
