"""
Serializers for Volunteer Management domain.
"""
from rest_framework import serializers
from .models import VolunteerOpportunity, VolunteerApplication

class VolunteerOpportunitySerializer(serializers.ModelSerializer):
    charity_name = serializers.CharField(source='charity_organization.name', read_only=True)
    campaign_title = serializers.CharField(source='campaign.title', read_only=True, allow_null=True)

    class Meta:
        model = VolunteerOpportunity
        fields = (
            'id', 'title', 'charity_organization', 'charity_name', 'campaign',
            'campaign_title', 'description', 'location', 'event_date',
            'slots_available', 'status', 'created_at', 'updated_at'
        )
        read_only_fields = ('charity_name', 'campaign_title', 'created_at', 'updated_at')


class VolunteerApplicationSerializer(serializers.ModelSerializer):
    volunteer_name = serializers.CharField(source='volunteer.email', read_only=True)
    opportunity_title = serializers.CharField(source='opportunity.title', read_only=True)

    class Meta:
        model = VolunteerApplication
        fields = (
            'id', 'opportunity', 'opportunity_title', 'volunteer',
            'volunteer_name', 'status', 'statement', 'applied_at', 'updated_at'
        )
        read_only_fields = ('volunteer', 'status', 'applied_at', 'updated_at')

    def validate(self, attrs):
        opportunity = attrs.get('opportunity')
        volunteer = self.context['request'].user
        if VolunteerApplication.objects.filter(opportunity=opportunity, volunteer=volunteer).exists():
             raise serializers.ValidationError({"detail": "You have already applied to this opportunity."})
        return attrs

    def create(self, validated_data):
        # Volunteer is set from request.user in viewset
        return super().create(validated_data)
