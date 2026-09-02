import { Link } from 'react-router-dom';
import { Container, Section, Reveal, Badge, Icon } from '@/components';
import { formatCurrency } from '@/utils/format';
import './campaign-preview.css';

/**
 * CampaignPreview — three representative demo campaigns. Illustrative
 * content only; clearly labelled. Uses real design-system components
 * (Card, Badge, Progress). The card image areas are intentionally designed
 * gradient placeholders — no external images.
 */

interface Campaign {
  id: number;
  title: string;
  org: string;
  category: string;
  raised: number;
  goal: number;
  daysLeft: number;
  gradientFrom: string;
  gradientTo: string;
}

const DEMO_CAMPAIGNS: Campaign[] = [
  {
    id: 1,
    title: 'Clean water for 3 villages',
    org: 'Vriksha Foundation',
    category: 'Water & Sanitation',
    raised: 320000,
    goal: 500000,
    daysLeft: 24,
    gradientFrom: 'var(--color-primary-soft, #ecfdf5)',
    gradientTo: 'var(--info-soft, #eff6ff)',
  },
  {
    id: 2,
    title: 'School supplies for 200 students',
    org: 'Pragati Education Society',
    category: 'Education',
    raised: 160000,
    goal: 250000,
    daysLeft: 11,
    gradientFrom: 'var(--warning-soft, #fffbeb)',
    gradientTo: 'var(--info-soft, #eff6ff)',
  },
  {
    id: 3,
    title: 'Mobile clinic for the hills',
    org: 'Himalayan Health Collective',
    category: 'Healthcare',
    raised: 780000,
    goal: 1000000,
    daysLeft: 31,
    gradientFrom: 'var(--info-soft, #eff6ff)',
    gradientTo: 'var(--color-primary-soft, #ecfdf5)',
  },
] as const;

function CampaignCard({ campaign }: { campaign: Campaign }) {
  const pct = Math.round((campaign.raised / campaign.goal) * 100);

  return (
    <Link to="/campaigns" className="campaign-preview__card">
      {/* Gradient placeholder for image area */}
      <div
        className="campaign-preview__img"
        style={{
          background: `linear-gradient(135deg, ${campaign.gradientFrom}, ${campaign.gradientTo})`,
        }}
        aria-hidden="true"
      >
        <span className="campaign-preview__img-label">{campaign.category}</span>
      </div>

      <div className="campaign-preview__body">
        <div className="campaign-preview__org">
          <Icon name="building" size={14} />
          <span>{campaign.org}</span>
        </div>

        <h3 className="campaign-preview__title">{campaign.title}</h3>

        {/* Progress — accessible with value and label */}
        <div
          className="campaign-preview__progress"
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${campaign.title}: ${pct} percent funded`}
        >
          <div className="campaign-preview__progress-track">
            <div
              className="campaign-preview__progress-fill"
              style={{ '--progress': `${pct}%` } as React.CSSProperties}
            />
          </div>
        </div>

        <div className="campaign-preview__meta">
          <span className="campaign-preview__raised">
            {formatCurrency(campaign.raised)} of {formatCurrency(campaign.goal)}
          </span>
          <span className="campaign-preview__days">
            <Icon name="calendar" size={12} />
            {campaign.daysLeft} days
          </span>
        </div>

        <Badge tone="accent" className="campaign-preview__badge">
          Verified
        </Badge>
      </div>
    </Link>
  );
}

export function CampaignPreview() {
  return (
    <Section
      headingLevel="h2"
      overline="Explore"
      heading="Verified campaigns, ready for your support"
      description="A preview of the kind of campaigns you can discover on TrustFund. Every one is from a document-verified organization."
      align="center"
      className="campaign-preview"
    >
      <Container>
        <p className="campaign-preview__note">
          Example campaigns — illustrative only
        </p>

        <div className="campaign-preview__grid">
          {DEMO_CAMPAIGNS.map((campaign, i) => (
            <Reveal key={campaign.id} delay={i * 100}>
              <CampaignCard campaign={campaign} />
            </Reveal>
          ))}
        </div>

        <Reveal delay={300}>
          <div className="campaign-preview__cta-wrap">
            <Link
              to="/campaigns"
              className="button button--primary button--md"
            >
              Browse all campaigns
              <Icon name="arrow-right" size={16} />
            </Link>
          </div>
        </Reveal>
      </Container>
    </Section>
  );
}
