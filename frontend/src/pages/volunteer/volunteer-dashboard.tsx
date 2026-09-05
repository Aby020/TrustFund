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
import { listAllApplications, listAllOpportunities } from '@/services/volunteers';
import { formatDate } from '@/utils/format';
import {
  APPLICATION_STATUS_LABELS,
  APPLICATION_STATUS_TONES,
  OPPORTUNITY_STATUS_LABELS,
} from '@/types/api';
import type {
  ApiError,
  VolunteerApplication,
  VolunteerOpportunity,
} from '@/types/api';
import { VolunteerNav } from './volunteer-nav';
import './volunteer-dashboard.css';

/**
 * VolunteerDashboard — the authenticated volunteer home. Stats are derived
 * from the real (server-filtered) opportunity and application datasets — no
 * fabricated numbers. Also surfaces recommended open opportunities and the
 * volunteer's most recent applications.
 */
export default function VolunteerDashboardPage() {
  const { user } = useAuth();
  const [opportunities, setOpportunities] = useState<VolunteerOpportunity[]>([]);
  const [applications, setApplications] = useState<VolunteerApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [opps, apps] = await Promise.all([
        listAllOpportunities(),
        listAllApplications(),
      ]);
      setOpportunities(opps);
      setApplications(apps);
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
  const openOpportunities = opportunities.filter((o) => o.status === 'OPEN');
  const recommended = openOpportunities.slice(0, 3);
  const pendingCount = applications.filter((a) => a.status === 'PENDING').length;
  const approvedCount = applications.filter((a) => a.status === 'APPROVED').length;

  return (
    <div className="volunteer-dashboard">
      <Container>
        <MotionReveal>
          <VolunteerNav />
        </MotionReveal>

        <MotionReveal className="volunteer-dashboard__header">
          <div>
            <p className="volunteer-dashboard__overline">Volunteering</p>
            <h1 className="volunteer-dashboard__title">Welcome back, {firstName}</h1>
            <p className="volunteer-dashboard__subtitle">
              Here is where you discover opportunities and track your applications.
            </p>
          </div>
          <Link to="/volunteer/manage/opportunities" className="volunteer-dashboard__header-cta">
            <Button variant="primary" size="md">
              Discover opportunities
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

        {!loading && !error && (
          <>
            <motion.div
              className="volunteer-dashboard__stats"
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
            >
              <StatCard
                icon="target"
                label="Open opportunities"
                value={String(openOpportunities.length)}
                hint="Ready to join right now"
              />
              <StatCard
                icon="receipt"
                label="Applications submitted"
                value={String(applications.length)}
                hint="All time across opportunities"
              />
              <StatCard
                icon="user"
                label="Pending applications"
                value={String(pendingCount)}
                hint="Awaiting charity review"
              />
              <StatCard
                icon="check"
                label="Approved applications"
                value={String(approvedCount)}
                hint="Accepted and confirmed"
              />
            </motion.div>

            <div className="volunteer-dashboard__layout">
              <MotionReveal className="volunteer-dashboard__recent">
                <Card>
                  <CardContent className="volunteer-dashboard__recent-body">
                    <div className="volunteer-dashboard__section-head">
                      <h2 className="volunteer-dashboard__section-title">
                        Recommended opportunities
                      </h2>
                      {opportunities.length > 0 && (
                        <Link to="/volunteer/manage/opportunities" className="volunteer-dashboard__view-all">
                          View all
                        </Link>
                      )}
                    </div>

                    {opportunities.length === 0 ? (
                      <EmptyState
                        title="No opportunities yet"
                        description="When a charity posts a volunteer opportunity, it will appear here."
                        action={
                          <Link to="/volunteer/manage/opportunities">
                            <Button variant="primary">Discover opportunities</Button>
                          </Link>
                        }
                      />
                    ) : (
                      <ul className="volunteer-dashboard__list">
                        {recommended.map((opp) => (
                          <li key={opp.id}>
                            <OpportunityRow opportunity={opp} />
                          </li>
                        ))}
                      </ul>
                    )}
                  </CardContent>
                </Card>
              </MotionReveal>

              <MotionReveal className="volunteer-dashboard__aside" delay={0.1}>
                <Card className="volunteer-dashboard__activity">
                  <CardContent>
                    <div className="volunteer-dashboard__impact-head">
                      <span className="volunteer-dashboard__impact-icon" aria-hidden="true">
                        <Icon name="calendar" size={20} />
                      </span>
                      <h2 className="volunteer-dashboard__section-title">Recent applications</h2>
                    </div>

                    {applications.length === 0 ? (
                      <p className="volunteer-dashboard__impact-line">
                        You have not applied to any opportunity yet. Explore
                        opportunities and send your first application.
                      </p>
                    ) : (
                      <ul className="volunteer-dashboard__apps">
                        {applications.slice(0, 4).map((app) => (
                          <li key={app.id} className="volunteer-dashboard__app">
                            <Link
                              to={`/volunteer/manage/applications/${app.id}`}
                              className="volunteer-dashboard__app-main"
                            >
                              <span className="volunteer-dashboard__app-title">
                                {app.opportunity_title}
                              </span>
                              <span className="volunteer-dashboard__app-meta">
                                Applied {formatDate(app.applied_at)}
                              </span>
                            </Link>
                            <Badge tone={APPLICATION_STATUS_TONES[app.status] as 'warning' | 'success' | 'danger' | 'info'}>
                              {APPLICATION_STATUS_LABELS[app.status]}
                            </Badge>
                          </li>
                        ))}
                      </ul>
                    )}
                  </CardContent>
                </Card>

                <Card className="volunteer-dashboard__quick">
                  <CardContent>
                    <h3 className="volunteer-dashboard__quick-title">Quick actions</h3>
                    <div className="volunteer-dashboard__quick-list">
                      <Link to="/volunteer/manage/opportunities" className="volunteer-dashboard__quick-action">
                        <Icon name="target" size={18} />
                        <span>Find opportunities</span>
                      </Link>
                      <Link to="/volunteer/manage/applications" className="volunteer-dashboard__quick-action">
                        <Icon name="receipt" size={18} />
                        <span>Review my applications</span>
                      </Link>
                      <Link to="/volunteer/manage/notifications" className="volunteer-dashboard__quick-action">
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
    <motion.div variants={fadeUp} className="volunteer-dashboard__stat">
      <span className="volunteer-dashboard__stat-icon" aria-hidden="true">
        <Icon name={icon} size={20} />
      </span>
      <span className="volunteer-dashboard__stat-label">{label}</span>
      <span className="volunteer-dashboard__stat-value">{value}</span>
      <span className="volunteer-dashboard__stat-hint">{hint}</span>
    </motion.div>
  );
}

/* ------------------------------------------------------------------------- */
/*  Opportunity row                                                          */
/* ------------------------------------------------------------------------- */

function OpportunityRow({ opportunity }: { opportunity: VolunteerOpportunity }) {
  return (
    <Link
      to={`/volunteer/manage/opportunities/${opportunity.id}`}
      className="volunteer-dashboard__opp"
    >
      <div className="volunteer-dashboard__opp-main">
        <span className="volunteer-dashboard__opp-title">{opportunity.title}</span>
        <span className="volunteer-dashboard__opp-meta">
          {opportunity.charity_name} · {opportunity.location}
        </span>
        <span className="volunteer-dashboard__opp-date">
          {formatDate(opportunity.event_date)} · {opportunity.slots_available} slot{opportunity.slots_available === 1 ? '' : 's'}
        </span>
      </div>
      <Badge tone="success">{OPPORTUNITY_STATUS_LABELS[opportunity.status]}</Badge>
    </Link>
  );
}

/* ------------------------------------------------------------------------- */
/*  Loading skeleton                                                         */
/* ------------------------------------------------------------------------- */

function DashboardSkeleton() {
  return (
    <div className="volunteer-dashboard__skeleton">
      <div className="volunteer-dashboard__stats">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} variant="block" height={132} />
        ))}
      </div>
      <Skeleton variant="block" height={300} style={{ marginTop: 24 }} />
    </div>
  );
}