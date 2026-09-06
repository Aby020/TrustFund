import { useCallback, useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Badge, type BadgeTone, Button, Card, CardContent, EmptyState, ErrorState, Input, Select } from '@/components';
import { fadeUp, staggerContainer } from '@/components/motion/variants';
import { getAdminAnalytics, listAdminDonations } from '@/services/admin';
import { formatCurrency, formatDate } from '@/utils/format';
import { DONATION_STATUS_LABELS, DONATION_STATUS_TONES } from '@/types/api';
import type {
  AdminAnalytics,
  ApiError,
  Donation,
  DonationStatus,
  Paginated,
} from '@/types/api';
import { AdminPagination } from './admin-pagination';
import { TableSkeleton } from './admin-users';
import './admin-donations.css';

const STATUS_OPTIONS: { label: string; value: DonationStatus | '' }[] = [
  { label: 'All statuses', value: '' },
  ...(Object.keys(DONATION_STATUS_LABELS) as DonationStatus[]).map((s) => ({
    label: DONATION_STATUS_LABELS[s],
    value: s,
  })),
];

export default function AdminDonationsPage() {
  const [donations, setDonations] = useState<Paginated<Donation> | null>(null);
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<DonationStatus | ''>('');
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [donRes, anRes] = await Promise.all([
        listAdminDonations({ page, search: search || undefined, status: status || undefined }),
        getAdminAnalytics(),
      ]);
      setDonations(donRes);
      setAnalytics(anRes);
    } catch (err) {
      setError(err as ApiError);
    } finally {
      setLoading(false);
    }
  }, [page, search, status]);

  useEffect(() => { load(); }, [load]);

  const totalPages = donations ? Math.max(1, Math.ceil(donations.count / 20)) : 1;

  return (
    <div className="admin-donations">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-header__title">Donations &amp; analytics</h1>
          <p className="admin-page-header__subtitle">
            Platform donation activity and success analytics.
          </p>
        </div>
      </div>

      {!loading && !error && analytics && (
        <motion.div className="admin-stat-grid" variants={staggerContainer} initial="hidden" animate="visible">
          <motion.div variants={fadeUp} className="admin-stat-card">
            <span className="admin-stat-card__label">Total campaigns</span>
            <span className="admin-stat-card__value">{analytics.total_campaigns}</span>
          </motion.div>
          <motion.div variants={fadeUp} className="admin-stat-card">
            <span className="admin-stat-card__label">Successful campaigns</span>
            <span className="admin-stat-card__value">{analytics.successful_campaigns}</span>
          </motion.div>
          <motion.div variants={fadeUp} className="admin-stat-card">
            <span className="admin-stat-card__label">Success rate</span>
            <span className="admin-stat-card__value">{analytics.success_rate_percentage}%</span>
          </motion.div>
        </motion.div>
      )}

      {!loading && !error && analytics && analytics.donations_by_category.length > 0 && (
        <Card className="admin-donations__analytics">
          <CardContent>
            <h2 className="admin-donations__section-title">Donations by category</h2>
            <ul className="admin-donations__category-list">
              {analytics.donations_by_category.map((cat) => (
                <li key={cat.category} className="admin-donations__category-item">
                  <span className="admin-donations__category-name">{cat.category}</span>
                  <span className="admin-donations__category-meta">
                    {cat.donation_count} donation{cat.donation_count === 1 ? '' : 's'}
                  </span>
                  <span className="admin-donations__category-amount">
                    {formatCurrency(Number(cat.total_amount))}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <div className="admin-donations__divider" />

      <div className="admin-filters">
        <Input
          type="search"
          placeholder="Search by donor or campaign…"
          aria-label="Search donations"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
        <Select
          value={status}
          aria-label="Filter by status"
          onChange={(e) => { setStatus(e.target.value as DonationStatus | ''); setPage(1); }}
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </Select>
      </div>

      {loading && <TableSkeleton cols={5} rows={4} />}

      {!loading && error && (
        <ErrorState
          title="Could not load donations"
          description={error.message}
          actions={<Button variant="primary" onClick={load}>Try again</Button>}
        />
      )}

      {!loading && !error && donations && donations.results.length === 0 && (
        <Card><CardContent>
          <EmptyState title="No donations found" description="Try adjusting your filters." />
        </CardContent></Card>
      )}

      {!loading && !error && donations && donations.results.length > 0 && (
        <>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th scope="col">Donor</th>
                  <th scope="col">Campaign</th>
                  <th scope="col">Amount</th>
                  <th scope="col">Status</th>
                  <th scope="col">Date</th>
                </tr>
              </thead>
              <tbody>
                {donations.results.map((d) => (
                  <tr key={d.id}>
                    <td>{d.is_anonymous ? 'Anonymous' : d.donor_email}</td>
                    <td>{d.campaign_title}</td>
                    <td>{formatCurrency(Number(d.amount))}</td>
                    <td>
                      <Badge tone={DONATION_STATUS_TONES[d.status] as BadgeTone}>{d.status_display}</Badge>
                    </td>
                    <td>{formatDate(d.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <AdminPagination page={page} totalPages={totalPages} count={donations.count} onChange={setPage} />
        </>
      )}
    </div>
  );
}