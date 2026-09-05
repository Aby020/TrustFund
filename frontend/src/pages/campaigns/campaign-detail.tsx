import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  Badge,
  Button,
  Container,
  ErrorState,
  Progress,
  Section,
  Skeleton,
} from '@/components';
import { MotionReveal } from '@/components/motion/motion-reveal';
import { fadeUp } from '@/components/motion/variants';
import { getCampaign, listCampaignUpdates } from '@/services/campaigns';
import { formatCurrency, formatDate } from '@/utils/format';
import type { Campaign, CampaignUpdate, ApiError } from '@/types/api';
import './campaign-detail.css';

/** Map category to badge tone. */
const CATEGORY_TONE: Record<string, 'accent' | 'info' | 'success' | 'warning' | 'danger' | 'neutral'> = {
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

/**
 * CampaignDetail — full campaign page with hero, story, funding progress,
 * updates timeline, and donation CTA. Publicly accessible.
 */
export default function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [updates, setUpdates] = useState<CampaignUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [camp, updatesRes] = await Promise.all([
          getCampaign(Number(id)),
          listCampaignUpdates(Number(id)),
        ]);
        if (!cancelled) {
          setCampaign(camp);
          setUpdates(updatesRes.results);
        }
      } catch (err) {
        if (!cancelled) setError(err as ApiError);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [id]);

  // --- Loading state ---
  if (loading) {
    return (
      <div className="campaign-detail">
        <div className="campaign-detail__hero-skeleton">
          <Container>
            <Skeleton variant="text" width="40%" height={20} />
            <Skeleton variant="text" width="70%" height={36} style={{ marginTop: 12 }} />
            <Skeleton variant="text" width="30%" height={16} style={{ marginTop: 8 }} />
          </Container>
        </div>
        <Container>
          <div className="campaign-detail__layout">
            <div className="campaign-detail__main">
              <Skeleton variant="block" height={200} />
              <Skeleton variant="block" height={120} style={{ marginTop: 16 }} />
            </div>
            <aside className="campaign-detail__sidebar">
              <Skeleton variant="block" height={260} />
            </aside>
          </div>
        </Container>
      </div>
    );
  }

  // --- Error state ---
  if (error) {
    return (
      <Container>
        <div className="campaign-detail__error">
          <ErrorState
            title="Campaign not found"
            description={error.status === 404
              ? "This campaign doesn't exist or has been removed."
              : error.message}
            actions={
              <Link to="/campaigns">
                <Button variant="primary">Browse campaigns</Button>
              </Link>
            }
          />
        </div>
      </Container>
    );
  }

  if (!campaign) return null;

  const goal = Number(campaign.goal_amount);
  const raised = Number(campaign.raised_amount);
  const progressPercent = goal > 0 ? Math.min((raised / goal) * 100, 100) : 0;
  const isActive = campaign.status === 'ACTIVE';

  return (
    <div className="campaign-detail">
      {/* Hero banner */}
      <motion.div
        className="campaign-detail__hero"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <Container>
          {/* Hero image — same campaign.image used on the discovery card */}
          <MotionReveal className="campaign-detail__hero-image" variant={fadeUp}>
            {campaign.image ? (
              <img
                src={campaign.image}
                alt={campaign.title}
                className="campaign-detail__hero-img"
                fetchPriority="high"
                decoding="async"
              />
            ) : (
              <div
                className={`campaign-detail__hero-placeholder campaign-detail__hero-placeholder--${campaign.category.toLowerCase()}`}
                role="img"
                aria-label={campaign.title}
              >
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="1.5" />
                  <circle cx="8.5" cy="8.5" r="2" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M3 16l5-5 4 4 3-3 6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            )}
          </MotionReveal>

          <div className="campaign-detail__hero-content">
            <div className="campaign-detail__hero-kicker">
              <Badge
                tone={CATEGORY_TONE[campaign.category] ?? 'neutral'}
                className="campaign-detail__category-badge"
              >
                {campaign.category_display}
              </Badge>
              {campaign.organization_verified && (
                <span className="campaign-detail__verified">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M12 2L3 7v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5Z" stroke="currentColor" strokeWidth="1.5" />
                    <path d="m9 12 2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Verified charity
                </span>
              )}
            </div>
            <h1 className="campaign-detail__title">{campaign.title}</h1>
            <p className="campaign-detail__org">
              by {campaign.organization_name}
              {campaign.location && (
                <>
                  {' '}· {campaign.location}
                </>
              )}
            </p>
          </div>
        </Container>
      </motion.div>

      <Container>
        <div className="campaign-detail__layout">
          {/* Main content */}
          <MotionReveal className="campaign-detail__main" variant={fadeUp}>
            {/* Story section */}
            <Section headingLevel="h2" heading="About this campaign" className="campaign-detail__section">
              <div className="campaign-detail__description">
                {campaign.description.split('\n').map((paragraph, i) => (
                  <p key={i}>{paragraph}</p>
                ))}
              </div>
            </Section>

            {/* Updates section */}
            {updates.length > 0 && (
              <Section headingLevel="h2" heading="Updates" className="campaign-detail__section">
                <div className="campaign-detail__updates">
                  {updates.map((update) => (
                    <article key={update.id} className="campaign-detail__update">
                      <div className="campaign-detail__update-header">
                        <h3 className="campaign-detail__update-title">{update.title}</h3>
                        <time className="campaign-detail__update-date" dateTime={update.created_at}>
                          {formatDate(update.created_at)}
                        </time>
                      </div>
                      <p className="campaign-detail__update-content">{update.content}</p>
                      <p className="campaign-detail__update-author">
                        — {update.created_by_name}
                      </p>
                    </article>
                  ))}
                </div>
              </Section>
            )}
          </MotionReveal>

          {/* Sidebar — funding + CTA */}
          <MotionReveal className="campaign-detail__sidebar" variant={fadeUp} delay={0.1}>
            <div className="campaign-detail__funding-card">
              <div className="campaign-detail__funding-amounts">
                <span className="campaign-detail__raised">{formatCurrency(raised)}</span>
                <span className="campaign-detail__goal">raised of {formatCurrency(goal)} goal</span>
              </div>

              <Progress
                value={progressPercent}
                label={`${campaign.title} funding progress`}
              />

              <div className="campaign-detail__funding-meta">
                <div className="campaign-detail__meta-item">
                  <span className="campaign-detail__meta-value">{Math.round(progressPercent)}%</span>
                  <span className="campaign-detail__meta-label">funded</span>
                </div>
                {campaign.end_date && (
                  <div className="campaign-detail__meta-item">
                    <span className="campaign-detail__meta-value">{formatDate(campaign.end_date)}</span>
                    <span className="campaign-detail__meta-label">end date</span>
                  </div>
                )}
              </div>

              {isActive ? (
                <Link to={`/campaigns/${campaign.id}/donate`} className="campaign-detail__donate-link">
                  <Button variant="primary" size="lg" fullWidth>
                    Donate now
                  </Button>
                </Link>
              ) : (
                <Button variant="secondary" size="lg" fullWidth disabled>
                  {campaign.status_display}
                </Button>
              )}

              <p className="campaign-detail__trust-note">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M12 2L3 7v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5Z" stroke="currentColor" strokeWidth="1.5" />
                  <path d="m9 12 2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                All donations are verified and receipts are generated automatically.
              </p>
            </div>

            {/* Campaign dates */}
            <div className="campaign-detail__dates-card">
              <h3 className="campaign-detail__dates-title">Campaign details</h3>
              <dl className="campaign-detail__dates-list">
                {campaign.start_date && (
                  <>
                    <dt>Started</dt>
                    <dd>{formatDate(campaign.start_date)}</dd>
                  </>
                )}
                {campaign.end_date && (
                  <>
                    <dt>Ends</dt>
                    <dd>{formatDate(campaign.end_date)}</dd>
                  </>
                )}
                <dt>Category</dt>
                <dd>{campaign.category_display}</dd>
                <dt>Status</dt>
                <dd>
                  <Badge
                    tone={isActive ? 'success' : 'neutral'}
                    dot={isActive}
                  >
                    {campaign.status_display}
                  </Badge>
                </dd>
              </dl>
            </div>
          </MotionReveal>
        </div>
      </Container>
    </div>
  );
}
