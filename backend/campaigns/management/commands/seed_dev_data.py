"""
Development seed data for TrustFund.

Creates verified charity organizations and ACTIVE campaigns so the public
campaign discovery experience has realistic, manually-testable data. Safe to
re-run: organizations are fetched-or-created and campaigns are upserted by
title, so re-running never duplicates and picks up new/updated entries.

Usage:
    python manage.py seed_dev_data
"""
from datetime import date

from django.core.management.base import BaseCommand

from campaigns.models import Campaign, CampaignCategory, CampaignStatus, CampaignUpdate
from charities.models import CharityOrganization, VerificationStatus
from users.models import Role, User


# Each organization owns a charity user and is VERIFIED so its campaigns are
# visible in the public discovery feed.
ORGANIZATIONS = [
    {
        'email': 'water@sevabharat.dev',
        'first_name': 'Meera',
        'last_name': 'Iyer',
        'name': 'Jal Seva Foundation',
        'registration_number': 'TRF-WATER-001',
        'city': 'Bhubaneswar',
        'state': 'Odisha',
        'country': 'India',
        'description': 'Bringing safe drinking water to rural communities.',
    },
    {
        'email': 'education@vidyakiran.dev',
        'first_name': 'Arjun',
        'last_name': 'Nair',
        'name': 'Vidya Kiran Trust',
        'registration_number': 'TRF-EDU-001',
        'city': 'Gangtok',
        'state': 'Sikkim',
        'country': 'India',
        'description': 'Improving access to quality education for underserved children.',
    },
    {
        'email': 'health@aarogyam.dev',
        'first_name': 'Priya',
        'last_name': 'Rao',
        'name': 'Aarogya Health Mission',
        'registration_number': 'TRF-HEALTH-001',
        'city': 'Bhubaneswar',
        'state': 'Odisha',
        'country': 'India',
        'description': 'Community health clinics and outreach in rural India.',
    },
    {
        'email': 'food@annadaan.dev',
        'first_name': 'Ravi',
        'last_name': 'Menon',
        'name': 'Annadaan Collective',
        'registration_number': 'TRF-FOOD-001',
        'city': 'Chennai',
        'state': 'Tamil Nadu',
        'country': 'India',
        'description': 'Nutritious meals for daily-wage workers and families in need.',
    },
    {
        'email': 'relief@rahat.dev',
        'first_name': 'Sana',
        'last_name': 'Hussain',
        'name': 'Rahat Relief Network',
        'registration_number': 'TRF-RELIEF-001',
        'city': 'Guwahati',
        'state': 'Assam',
        'country': 'India',
        'description': 'Rapid humanitarian relief for flood-affected communities.',
    },
    {
        'email': 'animals@sevabharat.dev',
        'first_name': 'Kabir',
        'last_name': 'Deshmukh',
        'name': 'Prani Seva Sansthan',
        'registration_number': 'TRF-ANIMALS-001',
        'city': 'Pune',
        'state': 'Maharashtra',
        'country': 'India',
        'description': 'Stray-animal rescue, shelter, and veterinary care.',
    },
    {
        'email': 'poverty@sevabharat.dev',
        'first_name': 'Nisha',
        'last_name': 'Sharma',
        'name': 'Udyog Nari Foundation',
        'registration_number': 'TRF-POVERTY-001',
        'city': 'Jaipur',
        'state': 'Rajasthan',
        'country': 'India',
        'description': 'Livelihood and skill-building support for rural women.',
    },
    {
        'email': 'other@sevabharat.dev',
        'first_name': 'Rohan',
        'last_name': 'Kumar',
        'name': 'Gram Connect Trust',
        'registration_number': 'TRF-OTHER-001',
        'city': 'Ranchi',
        'state': 'Jharkhand',
        'country': 'India',
        'description': 'Digital access and community infrastructure for rural India.',
    },
]

# Campaigns reference images already stored in MEDIA_ROOT/campaigns/ (see
# media/campaigns/CREDITS.md for licensing).
CAMPAIGNS = [
    {
        'org_email': 'water@sevabharat.dev',
        'title': 'Clean Water for Kalahandi Villages',
        'description': (
            'Every day, families in Kalahandi walk kilometres to fetch water from '
            'open ponds shared with livestock. Contaminated water causes repeated '
            'illness and keeps children out of school. This campaign installs hand '
            'pumps and rainwater-harvesting tanks across five villages, giving more '
            'than 4,000 people a clean, reliable source of drinking water close to home.'
        ),
        'category': CampaignCategory.COMMUNITY,
        'goal_amount': '600000',
        'raised_amount': '245000',
        'location': 'Kalahandi, Odisha',
        'image': 'campaigns/water.webp',
        'start_date': date(2026, 5, 1),
        'end_date': date(2026, 12, 31),
        'status': CampaignStatus.ACTIVE,
    },
    {
        'org_email': 'water@sevabharat.dev',
        'title': 'Safe Drinking Water for Gopalpur',
        'description': (
            'The coastal village of Gopalpur relies on a single saline borewell '
            'that turns unusable each dry season. We are funding a solar-powered '
            'water purification unit and pipeline network so every household has '
            'safe water year-round, cutting waterborne disease and hours spent '
            'collecting water.'
        ),
        'category': CampaignCategory.ENVIRONMENT,
        'goal_amount': '850000',
        'raised_amount': '120000',
        'location': 'Gopalpur, Odisha',
        'image': 'campaigns/drinking-water.webp',
        'start_date': date(2026, 7, 1),
        'end_date': date(2027, 3, 31),
        'status': CampaignStatus.ACTIVE,
    },
    {
        'org_email': 'education@vidyakiran.dev',
        'title': 'Classroom Kits for Rural Schools',
        'description': (
            'Dozens of rural primary schools share a single blackboard and have no '
            'notebooks, pencils, or reading books for their students. We are '
            'delivering complete classroom kits — stationery, textbooks, and '
            'learning materials — to 60 schools, reaching 12,000 students and '
            'reducing dropout rates in the region.'
        ),
        'category': CampaignCategory.EDUCATION,
        'goal_amount': '400000',
        'raised_amount': '310000',
        'location': 'East Sikkim',
        'image': 'campaigns/education.webp',
        'start_date': date(2026, 6, 15),
        'end_date': date(2026, 11, 30),
        'status': CampaignStatus.ACTIVE,
    },
    {
        'org_email': 'education@vidyakiran.dev',
        'title': 'Scholarships for First-Generation Learners',
        'description': (
            'Talented students from low-income families often stop studying after '
            'class 8 because their families cannot afford fees, uniforms, and books. '
            'These scholarships cover the full cost of secondary school for 150 '
            'first-generation learners, giving them a real path out of poverty.'
        ),
        'category': CampaignCategory.CHILDREN,
        'goal_amount': '750000',
        'raised_amount': '98000',
        'location': 'Gangtok, Sikkim',
        'image': 'campaigns/children.webp',
        'start_date': date(2026, 8, 1),
        'end_date': date(2027, 4, 30),
        'status': CampaignStatus.ACTIVE,
    },
    {
        'org_email': 'health@aarogyam.dev',
        'title': 'Mobile Health Clinic for Sundarbans',
        'description': (
            'Island communities in the Sundarbans have no nearby doctor, and travel '
            'to a hospital can take a full day by boat. This mobile clinic brings a '
            'doctor, nurse, medicines, and basic diagnostics to 30 remote villages '
            'twice a week, treating over 8,000 patients a year.'
        ),
        'category': CampaignCategory.MEDICAL,
        'goal_amount': '1200000',
        'raised_amount': '520000',
        'location': 'Sundarbans, West Bengal',
        'image': 'campaigns/clinic.webp',
        'start_date': date(2026, 4, 1),
        'end_date': date(2027, 3, 31),
        'status': CampaignStatus.ACTIVE,
    },
    {
        'org_email': 'health@aarogyam.dev',
        'title': 'Free Immunization Drives for Newborns',
        'description': (
            'One in five newborns in our target districts misses essential '
            'vaccinations, leaving them vulnerable to preventable diseases. We fund '
            'outreach immunization camps, cold-chain equipment, and trained '
            'community health workers to protect 10,000 children in their first year '
            'of life.'
        ),
        'category': CampaignCategory.MEDICAL,
        'goal_amount': '550000',
        'raised_amount': '180000',
        'location': 'Bhubaneswar, Odisha',
        'image': 'campaigns/healthcare.webp',
        'start_date': date(2026, 5, 20),
        'end_date': date(2026, 12, 15),
        'status': CampaignStatus.ACTIVE,
    },
    {
        'org_email': 'food@annadaan.dev',
        'title': 'Hot Meals for Daily-Wage Workers',
        'description': (
            'Thousands of daily-wage workers and their families struggle to afford a '
            'single nutritious meal a day. Our community kitchens serve fresh, hot '
            'meals every evening. This campaign keeps three kitchens running for a '
            'year, providing 150,000 meals to workers, the elderly, and children in '
            'urban Chennai.'
        ),
        'category': CampaignCategory.FOOD,
        'goal_amount': '900000',
        'raised_amount': '640000',
        'location': 'Chennai, Tamil Nadu',
        'image': 'campaigns/food.webp',
        'start_date': date(2026, 3, 1),
        'end_date': date(2026, 12, 31),
        'status': CampaignStatus.ACTIVE,
    },
    {
        'org_email': 'relief@rahat.dev',
        'title': 'Emergency Flood Relief for Assam',
        'description': (
            'Seasonal floods displace tens of thousands of families in Assam every '
            'year, destroying homes, crops, and livelihoods. This campaign delivers '
            'immediate relief kits — food, clean water, tarpaulins, and hygiene '
            'supplies — to 5,000 displaced families, and funds temporary shelters '
            'and clean drinking water points.'
        ),
        'category': CampaignCategory.DISASTER_RELIEF,
        'goal_amount': '1500000',
        'raised_amount': '875000',
        'location': 'Guwahati, Assam',
        'image': 'campaigns/disaster-relief.webp',
        'start_date': date(2026, 7, 1),
        'end_date': date(2027, 1, 31),
        'status': CampaignStatus.ACTIVE,
    },
    {
        'org_email': 'animals@sevabharat.dev',
        'title': 'Community Rescue & Veterinary Care for Stray Animals',
        'description': (
            'Thousands of stray dogs and cats across Pune live with untreated '
            'injuries, infections, and preventable disease. This campaign funds an '
            'animal rescue helpline, emergency veterinary treatment, sterilization '
            'camps, and adoption drives — caring for more than 2,000 animals a year '
            'and keeping communities and animals safer together.'
        ),
        'category': CampaignCategory.ANIMALS,
        'goal_amount': '450000',
        'raised_amount': '135000',
        'location': 'Pune, Maharashtra',
        'image': 'campaigns/animals.webp',
        'start_date': date(2026, 6, 1),
        'end_date': date(2027, 2, 28),
        'status': CampaignStatus.ACTIVE,
    },
    {
        'org_email': 'poverty@sevabharat.dev',
        'title': 'Livelihood Kits for Rural Women',
        'description': (
            'Rural women in Rajasthan often have craft skills but no capital to '
            'turn them into income. Each livelihood kit provides sewing machines, '
            'tailoring or handicraft tools, and raw materials, along with '
            'skill training and market access — giving 300 women a sustainable way '
            'to support their families and gain financial independence.'
        ),
        'category': CampaignCategory.POVERTY,
        'goal_amount': '700000',
        'raised_amount': '210000',
        'location': 'Jaipur, Rajasthan',
        'image': 'campaigns/livelihood.webp',
        'start_date': date(2026, 5, 10),
        'end_date': date(2027, 3, 31),
        'status': CampaignStatus.ACTIVE,
    },
    {
        'org_email': 'other@sevabharat.dev',
        'title': 'Community Digital Access Initiative',
        'description': (
            'Many villages in Jharkhand have no reliable way for residents to access '
            'government services, education, or banking online. This initiative sets '
            'up solar-powered digital access points with computers and trained '
            'facilitators, connecting 15 villages and giving 20,000 people their '
            'first bridge to the digital economy.'
        ),
        'category': CampaignCategory.OTHER,
        'goal_amount': '950000',
        'raised_amount': '340000',
        'location': 'Ranchi, Jharkhand',
        'image': 'campaigns/digital-access.webp',
        'start_date': date(2026, 7, 15),
        'end_date': date(2027, 6, 30),
        'status': CampaignStatus.ACTIVE,
    },
]

# Campaign updates authored by the campaign's charity owner (visible on detail page).
UPDATES = [
    ('Clean Water for Kalahandi Villages', 'First two hand pumps installed',
     'Our team completed installation in the first two villages. Water testing '
     'confirms the supply is safe to drink. Thanks to every donor who made this possible.'),
    ('Classroom Kits for Rural Schools', 'Stationery delivered to 25 schools',
     'We distributed notebooks, pencils, and textbooks to 25 schools this month, '
     'reaching about 5,000 students. The remaining schools are scheduled next quarter.'),
    ('Mobile Health Clinic for Sundarbans', 'Clinic completes 100th camp',
     'Our mobile clinic completed its 100th village visit, treating over 6,000 '
     'patients so far. We are expanding to two additional routes next month.'),
    ('Community Rescue & Veterinary Care for Stray Animals', 'First sterilization camp held',
     'Our first sterilization and vaccination camp treated 120 dogs across three '
     'neighbourhoods. The rescue helpline is now fielding calls city-wide.'),
    ('Livelihood Kits for Rural Women', 'First 80 livelihood kits distributed',
     'We distributed the first 80 sewing and tailoring kits and started the '
     'inaugural skill-training batch. Trainees are already taking their first orders.'),
    ('Community Digital Access Initiative', 'First two digital access points live',
     'The first two solar-powered access points are open, serving about 400 '
     'residents a week with e-governance and banking support.'),
]


class Command(BaseCommand):
    help = 'Seed verified charities and ACTIVE campaigns for development.'

    def handle(self, *args, **options):
        orgs = self._ensure_organizations()

        created_count = 0
        updated_count = 0
        for data in CAMPAIGNS:
            org = orgs[data['org_email']]
            defaults = {
                'organization': org,
                'description': data['description'],
                'category': data['category'],
                'goal_amount': data['goal_amount'],
                'raised_amount': data['raised_amount'],
                'location': data['location'],
                'start_date': data['start_date'],
                'end_date': data['end_date'],
                'status': data['status'],
            }
            campaign, created = Campaign.objects.update_or_create(
                title=data['title'],
                defaults=defaults,
            )
            # Image file already present in MEDIA_ROOT/campaigns/ (see CREDITS.md).
            campaign.image = data['image']
            campaign.save(update_fields=['image'])

            if created:
                created_count += 1
                self.stdout.write(self.style.SUCCESS(f'  + campaign: {campaign.title}'))
            else:
                updated_count += 1

        self._add_updates()
        self.stdout.write(self.style.SUCCESS(
            f'Seeded {len(CAMPAIGNS)} ACTIVE campaigns '
            f'({created_count} created, {updated_count} already present).'
        ))

    def _ensure_organizations(self):
        """Create (or fetch) the verified charity organizations."""
        orgs = {}
        for spec in ORGANIZATIONS:
            user, created = User.objects.get_or_create(
                email=spec['email'],
                defaults={
                    'first_name': spec['first_name'],
                    'last_name': spec['last_name'],
                    'role': Role.CHARITY,
                    'is_active': True,
                },
            )
            if created:
                # Deliberately synthetic — local development only. Never a real
                # credential; production accounts authenticate through the app.
                user.set_password('TEST_ONLY_PASSWORD')
                user.save()

            org, _ = CharityOrganization.objects.get_or_create(
                name=spec['name'],
                defaults={
                    'owner': user,
                    'description': spec['description'],
                    'email': spec['email'],
                    'registration_number': spec['registration_number'],
                    'city': spec['city'],
                    'state': spec['state'],
                    'country': spec['country'],
                    'verification_status': VerificationStatus.VERIFIED,
                },
            )
            orgs[spec['email']] = org
        return orgs

    def _add_updates(self):
        for title, update_title, content in UPDATES:
            try:
                campaign = Campaign.objects.get(title=title)
            except Campaign.DoesNotExist:
                continue
            created_by = campaign.organization.owner
            CampaignUpdate.objects.get_or_create(
                campaign=campaign,
                title=update_title,
                defaults={'content': content, 'created_by': created_by},
            )
