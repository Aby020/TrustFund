"""
Admin configuration for Volunteer Management.
"""
from django.contrib import admin
from .models import VolunteerOpportunity, VolunteerApplication

@admin.register(VolunteerOpportunity)
class VolunteerOpportunityAdmin(admin.ModelAdmin):
    list_display = ('title', 'charity_organization', 'event_date', 'slots_available', 'status')
    search_fields = ('title', 'charity_organization__name', 'campaign__title')
    list_filter = ('status', 'event_date', 'charity_organization')
    ordering = ('-event_date',)

@admin.register(VolunteerApplication)
class VolunteerApplicationAdmin(admin.ModelAdmin):
    list_display = ('volunteer', 'opportunity', 'status', 'applied_at')
    search_fields = ('volunteer__email', 'opportunity__title')
    list_filter = ('status', 'applied_at')
    ordering = ('-applied_at',)
