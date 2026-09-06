import { Link } from 'react-router-dom';
import { Badge, Card, Icon } from '@/components';
import type { CharitySummary } from '@/services/charities-directory';
import { CATEGORY_LABELS, type CampaignCategory } from '@/types/api';
import './charity-card.css';

/** Map campaign category to a badge tone for visual distinction. */
const CATEGORY_TONE: Record<
  CampaignCategory,
  'accent' | 'info' | 'success' | 'warning' | 'danger' | 'neutral'
> = {
  MEDICAL: 'danger',
  EDUCATION: 'info',
  DISASTER_RELIEF: 'warning',
  ENVIRONMENT: 'success',
  ANIMALS: 'accent',
  COMMUNITY: 'neutral',
  CHILDREN: 'accent',
  FOOD: 'warning',
  POVERTY: 'danger',
  OTHER: 'neutral',
};

interface CharityCardProps {
  charity: CharitySummary;
  className?: string;
}

/**
 * CharityCard — a verified organization on the public directory. Shows the
 * name, location, verification badge, campaign categories, and direct links
 * into the charity's live campaigns. Only publicly-visible, campaign-derived
 * information is shown; never owner/contact details.
 */
export function CharityCard({ charity, className }: CharityCardProps) {
  return (
    <Card className={`charity-card ${className ?? ''}`}>
      <div className="charity-card__head">
        <span className="charity-card__avatar" aria-hidden="true">
          <Icon name="building" size={22} />
        </span>
        <div className="charity-card__titles">
          <h3 className="charity-card__name">{charity.name}</h3>
          {charity.location && (
            <p className="charity-card__location">
              <Icon name="target" size={12} />
              {charity.location}
            </p>
          )}
        </div>
      </div>

      <div className="charity-card__meta">
        <Badge tone="success" dot>
          Verified
        </Badge>
        <span className="charity-card__count">
          {charity.campaignCount} {charity.campaignCount === 1 ? 'campaign' : 'campaigns'}
        </span>
      </div>

      {charity.categories.length > 0 && (
        <div className="charity-card__categories" aria-label="Campaign categories">
          {charity.categories.slice(0, 3).map((category) => (
            <Badge key={category} tone={CATEGORY_TONE[category]} className="charity-card__category">
              {CATEGORY_LABELS[category]}
            </Badge>
          ))}
        </div>
      )}

      <ul className="charity-card__campaigns">
        {charity.campaigns.map((campaign) => (
          <li key={campaign.id}>
            <Link
              to={`/campaigns/${campaign.id}`}
              className="charity-card__campaign-link"
            >
              <span className="charity-card__campaign-title">{campaign.title}</span>
              <Icon name="arrow-right" size={14} className="charity-card__campaign-arrow" />
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}