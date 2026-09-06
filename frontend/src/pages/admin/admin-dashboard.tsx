import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Badge, type BadgeTone, Button, Card, CardContent, EmptyState, ErrorState, Icon, Skeleton } from '@/components';
import { MotionReveal } from '@/components/motion/motion-reveal';
import { fadeUp, staggerContainer } from '@/components/motion/variants';
import { getAdminDashboard, listOrganizations } from '@/services/admin';
import { formatCurrency } from '@/utils/format';
import {
  VERIFICATION_STATUS_LABELS,
  VERIFICATION_STATUS_TONES,
} from '@/types/api';
import type { AdminDashboard, ApiError, CharityOrganization } from '@/types/api';
import './admin-dashboard.css';

export default function AdminDashboardPage() {
  const [data, setData] = useState<AdminDashboard | null>(null);
  const [pendingOrgs, setPendingOrgs] = useState<CharityOrganization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [res, pending] = await Promise.all([
        getAdminDashboard(),
        listOrganizations({ status: 'PENDING' }),
      ]);
      setData(res);
      setPendingOrgs(pending);
    } catch (err) {
      setError(err as ApiError);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="admin-dashboard">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-header__title">Platform dashboard</h1>
          <p className="admin-page-header__subtitle">
            Real-time overview of the TrustFund platform.
          </p>
        </div>
        <Link to="/admin/manage/verifications">
          <Button variant="primary" size="md">
            <Icon name="shield" size={16} aria-hidden="true" />
            Review verifications
          </Button>
        </Link>
      </div>

      {loading && <DashboardSkeleton />}

      {!loading && error && (
        <ErrorState
          title="Could not load dashboard"
          description={error.message}
          actions={<Button variant="primary" onClick={load}>Try again</Button>}
        />
      )}

      {!loading && !error && !data && (
        <EmptyState
          title="No dashboard data"
          description="The platform dashboard has not returned any data yet. Check back soon."
        />
      )}

      {!loading && !error && data && (
        <>
          <motion.div className="admin-stat-grid" variants={staggerContainer} initial="hidden" animate="visible">
            <StatCard icon="users" label="Total users" value={String(data.total_users)} />
            <StatCard icon="building" label="Organizations" value={String(data.total_charities)} />
            <StatCard icon="check" label="Verified organizations" value={String(data.verified_charities)} />
            <StatCard icon="target" label="Campaigns" value={String(data.total_campaigns)} />
            <StatCard icon="trending-up" label="Active campaigns" value={String(data.active_campaigns)} />
            <StatCard icon="wallet" label="Total raised" value={formatCurrency(Number(data.total_raised))} />
          </motion.div>

          <MotionReveal>
            <Card>
              <CardContent>
                <div className="admin-dashboard__section-head">
                  <h2 className="admin-dashboard__section-title">Pending verifications</h2>
                  {pendingOrgs.length > 0 && (
                    <Link to="/admin/manage/verifications" className="admin-dashboard__view-all">Review all</Link>
                  )}
                </div>

                {pendingOrgs.length === 0 ? (
                  <EmptyState
                    title="No pending verifications"
                    description="Every charity organization has been reviewed. New submissions will appear here."
                  />
                ) : (
                  <ul className="admin-dashboard__activity-list">
                    {pendingOrgs.map((org) => (
                      <li key={org.id} className="admin-dashboard__activity-item">
                        <Link
                          to={`/admin/manage/verifications/${org.id}`}
                          className="admin-dashboard__activity-main"
                          style={{ textDecoration: 'none' }}
                        >
                          <span className="admin-dashboard__activity-label">{org.name}</span>
                          <span className="admin-dashboard__activity-meta">
                            {org.owner_name} · {org.email}
                          </span>
                        </Link>
                        <Badge tone={VERIFICATION_STATUS_TONES[org.verification_status] as BadgeTone}>
                          {VERIFICATION_STATUS_LABELS[org.verification_status]}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </MotionReveal>
        </>
      )}
    </div>
  );
}

/* ---- Stat card --------------------------------------------------------- */

interface StatCardProps {
  icon: string;
  label: string;
  value: string;
}

function StatCard({ icon, label, value }: StatCardProps) {
  return (
    <motion.div variants={fadeUp} className="admin-stat-card">
      <span className="admin-stat-card__label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <Icon name={icon as never} size={16} aria-hidden="true" />
        {label}
      </span>
      <span className="admin-stat-card__value">{value}</span>
    </motion.div>
  );
}

/* ---- Skeleton ---------------------------------------------------------- */

function DashboardSkeleton() {
  return (
    <div className="admin-dashboard__skeleton">
      <div className="admin-stat-grid">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} variant="block" height={110} />
        ))}
      </div>
      <Skeleton variant="block" height={240} style={{ marginTop: 24 }} />
    </div>
  );
}