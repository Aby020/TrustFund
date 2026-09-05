import { Link } from 'react-router-dom';
import { Badge, type BadgeTone } from '@/components';
import { formatCurrency, formatDate } from '@/utils/format';
import type { Donation, DonationStatus } from '@/types/api';
import './donation-list-item.css';

/** Map donation status to a badge tone for quick visual scanning. */
export const DONATION_STATUS_TONE: Record<DonationStatus, BadgeTone> = {
  PENDING: 'warning',
  SUCCESS: 'success',
  FAILED: 'danger',
  REFUNDED: 'neutral',
};

interface DonationListItemProps {
  donation: Donation;
  className?: string;
}

/** DonationListItem — one row in a donor's donation list. */
export function DonationListItem({ donation, className }: DonationListItemProps) {
  return (
    <Link to={`/donations/${donation.id}`} className={`donation-list-item ${className ?? ''}`}>
      <div className="donation-list-item__thumb" aria-hidden="true">
        {donation.campaign_image ? (
          <img src={donation.campaign_image} alt="" loading="lazy" className="donation-list-item__img" />
        ) : (
          <div className="donation-list-item__placeholder">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="1.5" />
              <path d="M3 16l5-5 4 4 3-3 6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        )}
      </div>

      <div className="donation-list-item__body">
        <span className="donation-list-item__title">{donation.campaign_title}</span>
        <span className="donation-list-item__meta">
          {formatDate(donation.created_at)} · {donation.status_display}
        </span>
      </div>

      <Badge tone={DONATION_STATUS_TONE[donation.status]} className="donation-list-item__badge">
        {donation.status_display}
      </Badge>

      <span className="donation-list-item__amount">{formatCurrency(donation.amount)}</span>
    </Link>
  );
}
