import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  Button,
  Container,
  EmptyState,
  ErrorState,
  Input,
  Section,
  Select,
} from '@/components';
import { MotionReveal } from '@/components/motion/motion-reveal';
import { fadeUp, staggerContainer } from '@/components/motion/variants';
import { listCampaigns } from '@/services/campaigns';
import { CampaignCard } from './campaign-card';
import { CampaignGridSkeleton } from './campaign-skeleton';
import { CATEGORY_LABELS, type Campaign, type ApiError } from '@/types/api';
import './campaign-discovery.css';

const SORT_OPTIONS = [
  { value: '-created_at', label: 'Newest first' },
  { value: 'created_at', label: 'Oldest first' },
  { value: '-raised_amount', label: 'Most funded' },
  { value: '-goal_amount', label: 'Highest goal' },
  { value: '-end_date', label: 'Ending soon' },
] as const;

const CATEGORY_OPTIONS = [
  { value: '', label: 'All categories' },
  ...Object.entries(CATEGORY_LABELS).map(([value, label]) => ({ value, label })),
] as const;

/**
 * CampaignDiscovery — public listing page with search, category filter,
 * sort, and pagination. URL-search-params driven for shareable links.
 */
export default function CampaignDiscoveryPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Read initial state from URL params
  const initialSearch = searchParams.get('search') ?? '';
  const initialPage = Number(searchParams.get('page') ?? '1');

  const [search, setSearch] = useState(initialSearch);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);
  const [page, setPage] = useState(initialPage);
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearch);

  const category = searchParams.get('category') ?? '';
  const ordering = searchParams.get('ordering') ?? '-created_at';

  const totalPages = Math.max(1, Math.ceil(count / 12));

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(timer);
  }, [search]);

  // Sync page to 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, category, ordering]);

  // Fetch campaigns
  const fetchCampaigns = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string | number> = { page };
      if (debouncedSearch) params.search = debouncedSearch;
      if (category) params.category = category;
      if (ordering) params.ordering = ordering;

      const data = await listCampaigns(params as Record<string, string | number>);
      setCampaigns(data.results);
      setCount(data.count);
    } catch (err) {
      setError(err as ApiError);
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, category, ordering]);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  // Update URL params when filters change
  function updateParam(key: string, value: string) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value) {
        next.set(key, value);
      } else {
        next.delete(key);
      }
      // Reset page on filter change
      next.delete('page');
      return next;
    });
  }

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    setSearch(e.target.value);
  }

  function handleCategoryChange(e: React.ChangeEvent<HTMLSelectElement>) {
    updateParam('category', e.target.value);
  }

  function handleSortChange(e: React.ChangeEvent<HTMLSelectElement>) {
    updateParam('ordering', e.target.value);
  }

  function handlePageChange(newPage: number) {
    setPage(newPage);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (newPage > 1) {
        next.set('page', String(newPage));
      } else {
        next.delete('page');
      }
      return next;
    });
    // Scroll to top of results
    document.getElementById('campaign-results')?.scrollIntoView({ behavior: 'smooth' });
  }

  return (
    <div className="campaign-discovery">
      <Section
        headingLevel="h1"
        overline="Discover"
        heading="Find a cause you care about"
        description="Browse verified campaigns and make a difference today."
        align="center"
        className="campaign-discovery__hero"
      />

      <Container>
        {/* Filters bar */}
        <MotionReveal className="campaign-discovery__filters">
          <div className="campaign-discovery__search">
            <Input
              type="search"
              placeholder="Search campaigns..."
              value={search}
              onChange={handleSearchChange}
              aria-label="Search campaigns"
            />
          </div>
          <div className="campaign-discovery__filter-group">
            <Select
              value={category}
              onChange={handleCategoryChange}
              aria-label="Filter by category"
              placeholder="All categories"
            >
              {CATEGORY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Select>
            <Select
              value={ordering}
              onChange={handleSortChange}
              aria-label="Sort campaigns"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Select>
          </div>
        </MotionReveal>

        {/* Results count */}
        {!loading && !error && (
          <p className="campaign-discovery__count" aria-live="polite">
            {count === 0
              ? 'No campaigns found'
              : `${count} campaign${count === 1 ? '' : 's'} found`}
          </p>
        )}

        {/* Results grid */}
        <div id="campaign-results" className="campaign-discovery__results">
          {loading && <CampaignGridSkeleton />}

          {!loading && error && (
            <ErrorState
              title="Failed to load campaigns"
              description={error.message}
              actions={
                <Button variant="primary" onClick={fetchCampaigns}>
                  Try again
                </Button>
              }
            />
          )}

          {!loading && !error && campaigns.length === 0 && (
            <EmptyState
              title="No campaigns found"
              description="Try adjusting your search or filters."
              action={
                <Button
                  variant="secondary"
                  onClick={() => {
                    setSearch('');
                    updateParam('category', '');
                    updateParam('ordering', '-created_at');
                  }}
                >
                  Clear filters
                </Button>
              }
            />
          )}

          {!loading && !error && campaigns.length > 0 && (
            <motion.div
              className="campaign-discovery__grid"
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
            >
              {campaigns.map((campaign) => (
                <motion.div key={campaign.id} variants={fadeUp}>
                  <CampaignCard campaign={campaign} />
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>

        {/* Pagination */}
        {!loading && !error && totalPages > 1 && (
          <nav
            className="campaign-discovery__pagination"
            aria-label="Campaign results pages"
          >
            <Button
              variant="secondary"
              size="sm"
              disabled={page <= 1}
              onClick={() => handlePageChange(page - 1)}
            >
              Previous
            </Button>
            <span className="campaign-discovery__page-info">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="secondary"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => handlePageChange(page + 1)}
            >
              Next
            </Button>
          </nav>
        )}
      </Container>
    </div>
  );
}
