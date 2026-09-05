import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Button,
  Card,
  CardContent,
  Container,
  EmptyState,
  ErrorState,
  Input,
  Select,
  Skeleton,
} from '@/components';
import { MotionReveal } from '@/components/motion/motion-reveal';
import { listMyDonations } from '@/services/donations';
import type { ApiError, Donation } from '@/types/api';
import { DonorNav } from './donor-nav';
import { DonationListItem } from './donation-list-item';
import './donation-history.css';

const PAGE_SIZE = 10;

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'All statuses' },
  { value: 'SUCCESS', label: 'Successful' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'FAILED', label: 'Failed' },
  { value: 'REFUNDED', label: 'Refunded' },
];

const SORT_OPTIONS = [
  { value: '-created_at', label: 'Newest first' },
  { value: 'created_at', label: 'Oldest first' },
  { value: '-amount', label: 'Largest amount' },
  { value: 'amount', label: 'Smallest amount' },
] as const;

/**
 * DonationHistory — the authenticated donor's full donation history with
 * search, status filter, and sort (all backed by the donations API).
 */
export default function DonationHistoryPage() {
  const [donations, setDonations] = useState<Donation[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [status, setStatus] = useState('');
  const [ordering, setOrdering] = useState('-created_at');
  const [page, setPage] = useState(1);

  // Debounce search input.
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(timer);
  }, [search]);

  // Reset to page 1 whenever filters change.
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, status, ordering]);

  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));

  const fetchDonations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listMyDonations({
        page,
        ...(debouncedSearch ? { search: debouncedSearch } : {}),
        ...(status ? { status } : {}),
        ordering,
      });
      setDonations(data.results);
      setCount(data.count);
    } catch (err) {
      setError(err as ApiError);
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, status, ordering]);

  useEffect(() => {
    fetchDonations();
  }, [fetchDonations]);

  function clearFilters() {
    setSearch('');
    setStatus('');
    setOrdering('-created_at');
  }

  return (
    <div className="donation-history">
      <Container>
        <MotionReveal>
          <DonorNav />
        </MotionReveal>

        <MotionReveal className="donation-history__header">
          <h1 className="donation-history__title">My Donations</h1>
          {!loading && !error && (
            <p className="donation-history__count" aria-live="polite">
              {count === 0 ? 'No donations' : `${count} donation${count === 1 ? '' : 's'}`}
            </p>
          )}
        </MotionReveal>

        <MotionReveal className="donation-history__controls">
          <div className="donation-history__search">
            <Input
              type="search"
              placeholder="Search by campaign or message..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search donations"
            />
          </div>
          <div className="donation-history__filters">
            <Select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              aria-label="Filter by status"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Select>
            <Select
              value={ordering}
              onChange={(e) => setOrdering(e.target.value)}
              aria-label="Sort donations"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Select>
          </div>
        </MotionReveal>

        {loading && <HistorySkeleton />}

        {!loading && error && (
          <ErrorState
            title="Could not load your donations"
            description={error.message}
            actions={
              <Button variant="primary" onClick={fetchDonations}>
                Try again
              </Button>
            }
          />
        )}

        {!loading && !error && donations.length === 0 && (
          <EmptyState
            title="No donations found"
            description={
              count > 0
                ? 'Try adjusting your search or filters.'
                : 'When you support a campaign, your donations will appear here.'
            }
            action={
              count > 0 ? (
                <Button variant="secondary" onClick={clearFilters}>
                  Clear filters
                </Button>
              ) : (
                <Link to="/campaigns">
                  <Button variant="primary">Discover campaigns</Button>
                </Link>
              )
            }
          />
        )}

        {!loading && !error && donations.length > 0 && (
          <Card className="donation-history__list-card">
            <CardContent className="donation-history__list-body">
              <ul className="donation-history__list">
                {donations.map((donation) => (
                  <li key={donation.id}>
                    <DonationListItem donation={donation} />
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {!loading && !error && totalPages > 1 && (
          <nav
            className="donation-history__pagination"
            aria-label="Donation pages"
          >
            <Button
              variant="secondary"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <span className="donation-history__page-info">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="secondary"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </nav>
        )}
      </Container>
    </div>
  );
}

function HistorySkeleton() {
  return (
    <div className="donation-history__skeleton">
      <Card>
        <CardContent className="donation-history__list-body">
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} variant="block" height={64} style={{ marginBottom: 8 }} />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
