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
import { getDonorDashboard } from '@/services/dashboard';
import { listMyDonations } from '@/services/donations';
import { formatCurrency } from '@/utils/format';
import type { ApiError, Donation, DonorDashboard } from '@/types/api';
import { DonorNav } from './donor-nav';
import { DonationListItem } from './donation-list-item';
import './donor-dashboard.css';

/**
 * DonorDashboard — the authenticated donor home. Shows real, aggregated
 * giving metrics from /dashboard/donor/ plus the most recent donations.
 * All figures are derived from the donor's actual donation records — no
 * fabricated impact statistics.
 */
export default function DonorDashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DonorDashboard | null>(null);
  const [recent, setRecent] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [dashboard, donations] = await Promise.all([
        getDonorDashboard(),
        listMyDonations({ page: 1 }),
      ]);
      setStats(dashboard);
      setRecent(donations.results.slice(0, 5));
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

  return (
    <div className="donor-dashboard">
      <Container>
        <MotionReveal>
          <DonorNav />
        </MotionReveal>

        <MotionReveal className="donor-dashboard__header">
          <div>
            <p className="donor-dashboard__overline">Your giving</p>
            <h1 className="donor-dashboard__title">Welcome back, {firstName}</h1>
            <p className="donor-dashboard__subtitle">
              Here is a summary of the difference you are making.
            </p>
          </div>
          <Link to="/campaigns" className="donor-dashboard__header-cta">
            <Button variant="primary" size="md">
              Discover campaigns
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
            <motion.div
              className="donor-dashboard__stats"
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
            >
              <StatCard
                icon="wallet"
                label="Total donated"
                value={formatCurrency(stats.total_donated)}
                hint="Successful contributions"
              />
              <StatCard
                icon="heart"
                label="Donations made"
                value={String(stats.donation_count)}
                hint="Across all campaigns"
              />
              <StatCard
                icon="target"
                label="Campaigns supported"
                value={String(stats.campaigns_supported)}
                hint="Where you have contributed"
              />
              <StatCard
                icon="receipt"
                label="Tax receipts"
                value={String(stats.total_receipts)}
                hint="Available for download"
              />
            </motion.div>

            <div className="donor-dashboard__layout">
              {/* Recent donations */}
              <MotionReveal className="donor-dashboard__recent">
                <Card>
                  <CardContent className="donor-dashboard__recent-body">
                    <div className="donor-dashboard__section-head">
                      <h2 className="donor-dashboard__section-title">Recent donations</h2>
                      {recent.length > 0 && (
                        <Link to="/donations" className="donor-dashboard__view-all">
                          View all
                        </Link>
                      )}
                    </div>

                    {recent.length === 0 ? (
                      <EmptyState
                        title="No donations yet"
                        description="When you support a campaign, your donations will appear here."
                        action={
                          <Link to="/campaigns">
                            <Button variant="primary">Discover campaigns</Button>
                          </Link>
                        }
                      />
                    ) : (
                      <ul className="donor-dashboard__list">
                        {recent.map((donation) => (
                          <li key={donation.id}>
                            <DonationListItem donation={donation} />
                          </li>
                        ))}
                      </ul>
                    )}
                  </CardContent>
                </Card>
              </MotionReveal>

              {/* Impact summary */}
              <MotionReveal className="donor-dashboard__aside" delay={0.1}>
                <Card className="donor-dashboard__impact">
                  <CardContent>
                    <div className="donor-dashboard__impact-head">
                      <span className="donor-dashboard__impact-icon" aria-hidden="true">
                        <Icon name="spark" size={20} />
                      </span>
                      <h2 className="donor-dashboard__section-title">Your impact</h2>
                    </div>

                    <p className="donor-dashboard__impact-line">
                      You have contributed{' '}
                      <strong>{formatCurrency(stats.total_donated)}</strong> across{' '}
                      <strong>
                        {stats.campaigns_supported}{' '}
                        {stats.campaigns_supported === 1 ? 'campaign' : 'campaigns'}
                      </strong>
                      .
                    </p>

                    <ul className="donor-dashboard__impact-list">
                      <li>
                        <Badge tone="success" dot>
                          {stats.total_receipts} receipt{stats.total_receipts === 1 ? '' : 's'} generated
                        </Badge>
                      </li>
                      <li>
                        <Badge tone="accent">Receipts auto-issued on success</Badge>
                      </li>
                    </ul>
                  </CardContent>
                </Card>

                <Card className="donor-dashboard__quick">
                  <CardContent>
                    <h3 className="donor-dashboard__quick-title">Quick actions</h3>
                    <div className="donor-dashboard__quick-list">
                      <Link to="/campaigns" className="donor-dashboard__quick-action">
                        <Icon name="heart" size={18} />
                        <span>Discover campaigns</span>
                      </Link>
                      <Link to="/donations" className="donor-dashboard__quick-action">
                        <Icon name="receipt" size={18} />
                        <span>View donation history</span>
                      </Link>
                      <Link to="/notifications" className="donor-dashboard__quick-action">
                        <Icon name="spark" size={18} />
                        <span>Notifications</span>
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
    <motion.div variants={fadeUp} className="donor-dashboard__stat">
      <span className="donor-dashboard__stat-icon" aria-hidden="true">
        <Icon name={icon} size={20} />
      </span>
      <span className="donor-dashboard__stat-label">{label}</span>
      <span className="donor-dashboard__stat-value">{value}</span>
      <span className="donor-dashboard__stat-hint">{hint}</span>
    </motion.div>
  );
}

/* ------------------------------------------------------------------------- */
/*  Loading skeleton                                                         */
/* ------------------------------------------------------------------------- */

function DashboardSkeleton() {
  return (
    <div className="donor-dashboard__skeleton">
      <div className="donor-dashboard__stats">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} variant="block" height={132} />
        ))}
      </div>
      <Skeleton variant="block" height={300} style={{ marginTop: 24 }} />
    </div>
  );
}
