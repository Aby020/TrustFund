"""
Models for Volunteer Management domain.
"""
from django.db import models
from users.models import User
from charities.models import CharityOrganization
from campaigns.models import Campaign


class OpportunityStatus(models.TextChoices):
    OPEN = 'OPEN', 'Open'
    CLOSED = 'CLOSED', 'Closed'
    COMPLETED = 'COMPLETED', 'Completed'


class ApplicationStatus(models.TextChoices):
    PENDING = 'PENDING', 'Pending'
    APPROVED = 'APPROVED', 'Approved'
    REJECTED = 'REJECTED', 'Rejected'
    ATTENDED = 'ATTENDED', 'Attended'


class VolunteerOpportunity(models.Model):
    """
    Represents a volunteer opportunity posted by a charity organization or for a campaign.
    """
    title = models.CharField(max_length=255)
    charity_organization = models.ForeignKey(
        CharityOrganization,
        on_delete=models.CASCADE,
        related_name='volunteer_opportunities'
    )
    campaign = models.ForeignKey(
        Campaign,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='volunteer_opportunities'
    )
    description = models.TextField()
    location = models.CharField(max_length=255)
    event_date = models.DateTimeField()
    slots_available = models.PositiveIntegerField(default=1)
    status = models.CharField(
        max_length=20,
        choices=OpportunityStatus.choices,
        default=OpportunityStatus.OPEN
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-event_date']
        indexes = [
            models.Index(fields=['status', 'event_date']),
            models.Index(fields=['charity_organization']),
        ]

    def __str__(self):
        return f"{self.title} at {self.charity_organization.name}"


class VolunteerApplication(models.Model):
    """
    Represents a user's application/registration for a volunteer opportunity.
    """
    opportunity = models.ForeignKey(
        VolunteerOpportunity,
        on_delete=models.CASCADE,
        related_name='applications'
    )
    volunteer = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='volunteer_applications'
    )
    status = models.CharField(
        max_length=20,
        choices=ApplicationStatus.choices,
        default=ApplicationStatus.PENDING
    )
    statement = models.TextField(blank=True, default='')
    applied_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('opportunity', 'volunteer')
        ordering = ['-applied_at']
        indexes = [
            models.Index(fields=['status']),
            models.Index(fields=['volunteer']),
        ]

    def __str__(self):
        return f"{self.volunteer.email} application for {self.opportunity.title}"
