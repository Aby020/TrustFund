import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  Badge,
  Button,
  Card,
  CardContent,
  Container,
  EmptyState,
  ErrorState,
  Icon,
  type IconName,
  Skeleton,
} from '@/components';
import { MotionReveal } from '@/components/motion/motion-reveal';
import { fadeUp, staggerContainer } from '@/components/motion/variants';
import { useAuth } from '@/context/auth-context';
import { getCharityDashboard } from '@/services/dashboard';
import { listCampaigns } from '@/services/campaigns';
import { formatCurrency, formatDate } from '@/utils/format';
import type { ApiError, Campaign, CharityDashboard } from '@/types/api';
import { CharityNav } from './charity-nav';
import './charity-dashboard.css';

/**
 * CharityDashboard — the authenticated charity home. Shows real, aggregated
 * metrics from /dashboard/charity/ plus the charity's most recent campaigns.
 * All figures are derived from actual records — no fabricated statistics.
 */
export default function CharityDashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<CharityDashboard | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const dashboard = await getCharityDashboard();
      setStats(dashboard);

      const orgId = dashboard.organization?.id;
      if (orgId) {
        const recent = await listCampaigns({ page: 1, organization: orgId });
        setCampaigns(recent.results.slice(0, 5));
      } else {
        setCampaigns([]);
      }
    } catch (err) {
      setError(err as ApiError);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const firstName = user?.firstName ?? 'there';
  const org = stats?.organization;

  return (
    <div className="charity-dashboard">
      <Container>
        <MotionReveal>
          <CharityNav />
        </MotionReveal>

        <MotionReveal className="charity-dashboard__header">
          <div>
            <p className="charity-dashboard__overline">Your organization</p>
            <h1 className="charity-dashboard__title">Welcome back, {firstName}</h1>
            <p className="charity-dashboard__subtitle">
              Here is how your campaigns and contributions are performing.
            </p>
          </div>
          <Link to="/charity/manage/campaigns/new" className="charity-dashboard__header-cta">
            <Button variant="primary" size="md">
              Create campaign
            </Button>
          </Link>
        </MotionReveal>

        {loading && <DashboardSkeleton />}

        {!loading && error && (
          <ErrorState
            title="Could not load your dashboard"
            description={error.message}
            actions={
              <Button variant="primary" onClick={load}>
                Try again
              </Button>
            }
          />
        )}

        {!loading && !error && stats && (
          <>
            {org && (
              <MotionReveal className="charity-dashboard__org" delay={0.05}>
                <div className="charity-dashboard__org-info">
                  <span className="charity-dashboard__org-icon" aria-hidden="true">
                    <Icon name="building" size={20} />
                  </span>
                  <div>
                    <p className="charity-dashboard__org-name">{org.name}</p>
                    <p className="charity-dashboard__org-status">
                      {org.is_verified ? 'Verified organization' : 'Verification pending'}
                    </p>
                  </div>
                </div>
                {org.is_verified ? (
                  <Badge tone="success" dot>
                    Verified
                  </Badge>
                ) : (
                  <Link to="/charity/manage/organization">
                    <Button variant="outline" size="sm">
                      Complete verification
                    </Button>
                  </Link>
                )}
              </MotionReveal>
            )}

            <motion.div
              className="charity-dashboard__stats"
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
            >
              <StatCard
                icon="wallet"
                label="Total raised"
                value={formatCurrency(stats.total_raised)}
                hint="Across all campaigns"
              />
              <StatCard
                icon="target"
                label="Campaigns"
                value={String(stats.campaigns_count)}
                hint="Total campaigns created"
              />
              <StatCard
                icon="trending-up"
                label="Active campaigns"
                value={String(stats.active_campaigns_count)}
                hint="Currently fundraising"
              />
              <StatCard
                icon="heart"
                label="Recent donations"
                value={String(stats.recent_donations?.length ?? 0)}
                hint="In the latest activity"
              />
            </motion.div>

            <div className="charity-dashboard__layout">
              <MotionReveal className="charity-dashboard__recent">
                <Card>
                  <CardContent className="charity-dashboard__recent-body">
                    <div className="charity-dashboard__section-head">
                      <h2 className="charity-dashboard__section-title">
                        Recent campaigns
                      </h2>
                      {campaigns.length > 0 && (
                        <Link to="/charity/manage/campaigns" className="charity-dashboard__view-all">
                          View all
                        </Link>
                      )}
                    </div>

                    {campaigns.length === 0 ? (
                      <EmptyState
                        title="No campaigns yet"
                        description="Create your first campaign to start raising funds."
                        action={
                          <Link to="/charity/manage/campaigns/new">
                            <Button variant="primary">Create campaign</Button>
                          </Link>
                        }
                      />
                    ) : (
                      <ul className="charity-dashboard__list">
                        {campaigns.map((campaign) => (
                          <li key={campaign.id}>
                            <CampaignRow campaign={campaign} />
                          </li>
                        ))}
                      </ul>
                    )}
                  </CardContent>
                </Card>
              </MotionReveal>

              <MotionReveal className="charity-dashboard__aside" delay={0.1}>
                <Card className="charity-dashboard__activity">
                  <CardContent>
                    <div className="charity-dashboard__impact-head">
                      <span className="charity-dashboard__impact-icon" aria-hidden="true">
                        <Icon name="heart" size={20} />
                      </span>
                      <h2 className="charity-dashboard__section-title">Latest donations</h2>
                    </div>

                    {!stats.recent_donations || stats.recent_donations.length === 0 ? (
                      <p className="charity-dashboard__impact-line">
                        No donations yet. Share your campaigns to start receiving
                        contributions.
                      </p>
                    ) : (
                      <ul className="charity-dashboard__donations">
                        {stats.recent_donations.map((donation) => (
                          <li key={donation.id} className="charity-dashboard__donation">
                            <div className="charity-dashboard__donation-main">
                              <span className="charity-dashboard__donation-title">
                                {donation.campaign_title}
                              </span>
                              <span className="charity-dashboard__donation-meta">
                                {donation.donor_name} · {formatDate(donation.created_at)}
                              </span>
                            </div>
                            <span className="charity-dashboard__donation-amount">
                              {formatCurrency(donation.amount)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </CardContent>
                </Card>

                <Card className="charity-dashboard__quick">
                  <CardContent>
                    <h3 className="charity-dashboard__quick-title">Quick actions</h3>
                    <div className="charity-dashboard__quick-list">
                      <Link to="/charity/manage/campaigns/new" className="charity-dashboard__quick-action">
                        <Icon name="target" size={18} />
                        <span>Create a campaign</span>
                      </Link>
                      <Link to="/charity/manage/volunteers" className="charity-dashboard__quick-action">
                        <Icon name="users" size={18} />
                        <span>Manage volunteers</span>
                      </Link>
                      <Link to="/charity/manage/organization" className="charity-dashboard__quick-action">
                        <Icon name="building" size={18} />
                        <span>Organization settings</span>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              </MotionReveal>
            </div>
          </>
        )}
      </Container>
    </div>
  );
}

/* ------------------------------------------------------------------------- */
/*  Stat card                                                                */
/* ------------------------------------------------------------------------- */

interface StatCardProps {
  icon: IconName;
  label: string;
  value: string;
  hint: string;
}

function StatCard({ icon, label, value, hint }: StatCardProps) {
  return (
    <motion.div variants={fadeUp} className="charity-dashboard__stat">
      <span className="charity-dashboard__stat-icon" aria-hidden="true">
        <Icon name={icon} size={20} />
      </span>
      <span className="charity-dashboard__stat-label">{label}</span>
      <span className="charity-dashboard__stat-value">{value}</span>
      <span className="charity-dashboard__stat-hint">{hint}</span>
    </motion.div>
  );
}

/* ------------------------------------------------------------------------- */
/*  Campaign row                                                             */
/* ------------------------------------------------------------------------- */

function CampaignRow({ campaign }: { campaign: Campaign }) {
  const raised = Number.parseFloat(campaign.raised_amount);
  const goal = Number.parseFloat(campaign.goal_amount);
  const percent = goal > 0 ? Math.min(100, Math.round((raised / goal) * 100)) : 0;

  return (
    <Link to={`/charity/manage/campaigns/${campaign.id}/edit`} className="charity-dashboard__campaign">
      <div className="charity-dashboard__campaign-main">
        <span className="charity-dashboard__campaign-title">{campaign.title}</span>
        <span className="charity-dashboard__campaign-meta">
          {formatCurrency(campaign.raised_amount)} raised of {formatCurrency(campaign.goal_amount)}
        </span>
        <span className="charity-dashboard__campaign-percent">{percent}%</span>
      </div>
      <Badge tone="neutral">{campaign.status_display}</Badge>
    </Link>
  );
}

/* ------------------------------------------------------------------------- */
/*  Loading skeleton                                                         */
/* ------------------------------------------------------------------------- */

function DashboardSkeleton() {
  return (
    <div className="charity-dashboard__skeleton">
      <div className="charity-dashboard__stats">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} variant="block" height={132} />
        ))}
      </div>
      <Skeleton variant="block" height={300} style={{ marginTop: 24 }} />
    </div>
  );
}
