import { Link } from 'react-router-dom';
import { Badge, Card, Progress } from '@/components';
import { formatCurrency, formatDate } from '@/utils/format';
import { cx } from '@/utils/cx';
import type { Campaign, CampaignCategory } from '@/types/api';
import './campaign-card.css';

/** Map campaign category to a badge tone for visual distinction. */
const CATEGORY_TONE: Record<CampaignCategory, 'accent' | 'info' | 'success' | 'warning' | 'danger' | 'neutral'> = {
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

interface CampaignCardProps {
  campaign: Campaign;
  className?: string;
}

/** CampaignCard — compact card for the campaign discovery grid. */
export function CampaignCard({ campaign, className }: CampaignCardProps) {
  const goal = Number(campaign.goal_amount);
  const raised = Number(campaign.raised_amount);
  const progressPercent = goal > 0 ? Math.min((raised / goal) * 100, 100) : 0;

  return (
    <Card interactive className={cx('campaign-card', className)}>
      <Link to={`/campaigns/${campaign.id}`} className="campaign-card__link">
        <div className="campaign-card__image" aria-hidden="true">
          {campaign.image ? (
            <img
              src={campaign.image}
              alt=""
              loading="lazy"
              className="campaign-card__img"
            />
          ) : (
            // Fallback when the backend has no image for this campaign.
            <div className={`campaign-card__placeholder campaign-card__placeholder--${campaign.category.toLowerCase()}`}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="1.5" />
                <circle cx="8.5" cy="8.5" r="2" stroke="currentColor" strokeWidth="1.5" />
                <path d="M3 16l5-5 4 4 3-3 6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          )}
          <Badge tone={CATEGORY_TONE[campaign.category]} className="campaign-card__category">
            {campaign.category_display}
          </Badge>
        </div>

        <div className="campaign-card__body">
          <h3 className="campaign-card__title">{campaign.title}</h3>
          <p className="campaign-card__org">{campaign.organization_name}</p>

          {campaign.location && (
            <p className="campaign-card__location">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7Z" stroke="currentColor" strokeWidth="1.5" />
                <circle cx="12" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.5" />
              </svg>
              {campaign.location}
            </p>
          )}

          <div className="campaign-card__progress">
            <Progress
              value={progressPercent}
              label={`${campaign.title} funding progress`}
            />
            <div className="campaign-card__stats">
              <span className="campaign-card__raised">{formatCurrency(raised)}</span>
              <span className="campaign-card__goal">of {formatCurrency(goal)}</span>
            </div>
          </div>

          {campaign.end_date && (
            <p className="campaign-card__date">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.5" />
                <path d="M3 9h18M8 2v4M16 2v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              Ends {formatDate(campaign.end_date)}
            </p>
          )}
        </div>
      </Link>
    </Card>
  );
}
