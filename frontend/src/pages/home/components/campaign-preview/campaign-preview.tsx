import { Link } from 'react-router-dom';
import { Container, Section, Badge, Icon } from '@/components';
import { motion } from 'motion/react';
import { staggerContainer, fadeUp, progressFill } from '@/components/motion/variants';
import { formatCurrency } from '@/utils/format';
import './campaign-preview.css';

/**
 * CampaignPreview — three representative demo campaigns. Illustrative
 * content only; clearly labelled. Uses real design-system components
 * (Card, Badge, Progress). The card image areas are intentionally designed
 * gradient placeholders — no external images. Migrated to Framer Motion.
 */

interface Campaign {
  id: number;
  title: string;
  org: string;
  category: string;
  raised: number;
  goal: number;
  daysLeft: number;
  image: string;
  alt: string;
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
    image: '/images/campaign-water.webp',
    alt: 'Children filling containers with clean water from a community hand pump in a village',
  },
  {
    id: 2,
    title: 'School supplies for 200 students',
    org: 'Pragati Education Society',
    category: 'Education',
    raised: 160000,
    goal: 250000,
    daysLeft: 11,
    image: '/images/campaign-education.webp',
    alt: 'Students writing on slates in a village school classroom',
  },
  {
    id: 3,
    title: 'Mobile clinic for the hills',
    org: 'Himalayan Health Collective',
    category: 'Healthcare',
    raised: 780000,
    goal: 1000000,
    daysLeft: 31,
    image: '/images/campaign-health.webp',
    alt: "A healthcare worker measuring a woman's blood pressure at an outdoor community clinic",
  },
] as const;

function CampaignCard({ campaign }: { campaign: Campaign }) {
  const pct = Math.round((campaign.raised / campaign.goal) * 100);

  return (
    <motion.div variants={fadeUp}>
      <Link to="/campaigns" className="campaign-preview__card">
        {/* Photography header — zero-CLS with aspect-ratio + explicit dimensions */}
        <div className="campaign-preview__img">
          <img
            className="campaign-preview__img-el"
            src={campaign.image}
            alt={campaign.alt}
            loading="lazy"
            decoding="async"
            width={640}
            height={360}
          />
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
              <motion.div
                className="campaign-preview__progress-fill"
                variants={progressFill}
                style={{
                  width: `${pct}%`,
                  transformOrigin: 'left',
                }}
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
    </motion.div>
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

        <motion.div
          className="campaign-preview__grid"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
        >
          {DEMO_CAMPAIGNS.map((campaign) => (
            <CampaignCard key={campaign.id} campaign={campaign} />
          ))}
        </motion.div>

        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          <div className="campaign-preview__cta-wrap">
            <Link
              to="/campaigns"
              className="button button--primary button--md"
            >
              Browse all campaigns
              <Icon name="arrow-right" size={16} />
            </Link>
          </div>
        </motion.div>
      </Container>
    </Section>
  );
}
