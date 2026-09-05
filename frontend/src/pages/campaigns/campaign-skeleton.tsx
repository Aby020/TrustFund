import { Card, Skeleton } from '@/components';

/** Skeleton shown while campaign cards are loading. */
export function CampaignCardSkeleton() {
  return (
    <Card className="campaign-card">
      <div className="campaign-card__link">
        <div className="campaign-card__image">
          <Skeleton style={{ width: '100%', height: '100%', borderRadius: 0 }} />
        </div>
        <div className="campaign-card__body">
          <Skeleton variant="text" width="80%" height={18} />
          <Skeleton variant="text" width="50%" height={14} />
          <Skeleton variant="text" width="40%" height={12} />
          <div style={{ marginTop: 'auto', paddingTop: 8 }}>
            <Skeleton variant="block" width="100%" height={6} />
            <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
              <Skeleton variant="text" width="30%" height={14} />
              <Skeleton variant="text" width="20%" height={14} />
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

/** Grid of skeleton cards shown during initial load. */
export function CampaignGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="campaign-discovery__grid" aria-label="Loading campaigns">
      {Array.from({ length: count }, (_, i) => (
        <CampaignCardSkeleton key={i} />
      ))}
    </div>
  );
}
