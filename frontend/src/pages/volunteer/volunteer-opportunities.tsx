import { useCallback, useEffect, useMemo, useState } from 'react';
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
  Input,
  Select,
  Skeleton,
} from '@/components';
import { MotionReveal } from '@/components/motion/motion-reveal';
import { fadeUp, staggerContainer } from '@/components/motion/variants';
import { listAllApplications, listAllOpportunities } from '@/services/volunteers';
import { formatDateTime } from '@/utils/format';
import {
  APPLICATION_STATUS_LABELS,
  APPLICATION_STATUS_TONES,
  OPPORTUNITY_STATUS_LABELS,
  OPPORTUNITY_STATUS_TONES,
} from '@/types/api';
import type {
  ApiError,
  VolunteerApplication,
  VolunteerOpportunity,
} from '@/types/api';
import { VolunteerNav } from './volunteer-nav';
import './volunteer-opportunities.css';

const STATUS_OPTIONS = [
  { value: 'ALL', label: 'All statuses' },
  { value: 'OPEN', label: 'Open' },
  { value: 'CLOSED', label: 'Closed' },
  { value: 'COMPLETED', label: 'Completed' },
] as const;

/**
 * VolunteerOpportunities — discovery list of volunteer opportunities.
 *
 * The opportunities API has no server-side search/filter support, so the full
 * dataset is fetched and filtered client-side. Applied state is derived by
 * cross-referencing the volunteer's own applications against each opportunity.
 */
export default function VolunteerOpportunitiesPage() {
  const [opportunities, setOpportunities] = useState<VolunteerOpportunity[]>([]);
  const [applications, setApplications] = useState<VolunteerApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>('ALL');

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

  const applicationsByOpportunity = useMemo(() => {
    const map = new Map<number, VolunteerApplication>();
    for (const app of applications) {
      if (!map.has(app.opportunity)) map.set(app.opportunity, app);
    }
    return map;
  }, [applications]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return opportunities
      .filter((o) => (status === 'ALL' ? true : o.status === status))
      .filter((o) => {
        if (!query) return true;
        return (
          o.title.toLowerCase().includes(query) ||
          o.description.toLowerCase().includes(query) ||
          o.location.toLowerCase().includes(query) ||
          o.charity_name.toLowerCase().includes(query) ||
          (o.campaign_title ?? '').toLowerCase().includes(query)
        );
      })
      .sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime());
  }, [opportunities, status, search]);

  const hasFilters = search.trim() !== '' || status !== 'ALL';

  function clearFilters() {
    setSearch('');
    setStatus('ALL');
  }

  return (
    <div className="volunteer-opportunities">
      <Container>
        <MotionReveal>
          <VolunteerNav />
        </MotionReveal>

        <MotionReveal className="volunteer-opportunities__header">
          <div>
            <p className="volunteer-opportunities__overline">Volunteering</p>
            <h1 className="volunteer-opportunities__title">Find an opportunity</h1>
            <p className="volunteer-opportunities__subtitle">
              Discover ways to give your time and skills to causes you care about.
            </p>
          </div>
        </MotionReveal>

        <MotionReveal className="volunteer-opportunities__filters">
          <div className="volunteer-opportunities__search">
            <Input
              type="search"
              placeholder="Search by title, organization, or location..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search opportunities"
            />
          </div>
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
        </MotionReveal>

        {!loading && !error && (
          <p className="volunteer-opportunities__count" aria-live="polite">
            {filtered.length === 0
              ? 'No opportunities found'
              : `${filtered.length} opportunity${filtered.length === 1 ? '' : 's'} found`}
          </p>
        )}

        {loading && <OpportunitiesSkeleton />}

        {!loading && error && (
          <ErrorState
            title="Could not load opportunities"
            description={error.message}
            actions={
              <Button variant="primary" onClick={load}>
                Try again
              </Button>
            }
          />
        )}

        {!loading && !error && filtered.length === 0 && (
          <EmptyState
            title={hasFilters ? 'No matching opportunities' : 'No opportunities yet'}
            description={
              hasFilters
                ? 'Try adjusting your search or filter.'
                : 'When a charity posts a volunteer opportunity, it will appear here.'
            }
            action={
              hasFilters ? (
                <Button variant="secondary" onClick={clearFilters}>
                  Clear filters
                </Button>
              ) : undefined
            }
          />
        )}

        {!loading && !error && filtered.length > 0 && (
          <motion.div
            className="volunteer-opportunities__grid"
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
          >
            {filtered.map((opportunity) => {
              const application = applicationsByOpportunity.get(opportunity.id);
              return (
                <motion.div key={opportunity.id} variants={fadeUp}>
                  <OpportunityCard
                    opportunity={opportunity}
                    application={application}
                  />
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </Container>
    </div>
  );
}

/* ------------------------------------------------------------------------- */
/*  Opportunity card                                                          */
/* ------------------------------------------------------------------------- */

function OpportunityCard({
  opportunity,
  application,
}: {
  opportunity: VolunteerOpportunity;
  application?: VolunteerApplication;
}) {
  const isOpen = opportunity.status === 'OPEN';

  return (
    <Card className="volunteer-opportunities__card">
      <CardContent className="volunteer-opportunities__card-body">
        <div className="volunteer-opportunities__card-head">
          <span className="volunteer-opportunities__org">{opportunity.charity_name}</span>
          <div className="volunteer-opportunities__badges">
            <Badge tone={OPPORTUNITY_STATUS_TONES[opportunity.status] as 'success' | 'neutral' | 'info'}>
              {OPPORTUNITY_STATUS_LABELS[opportunity.status]}
            </Badge>
            {application && (
              <Badge tone={APPLICATION_STATUS_TONES[application.status] as 'warning' | 'success' | 'danger' | 'info'}>
                Applied · {APPLICATION_STATUS_LABELS[application.status]}
              </Badge>
            )}
          </div>
        </div>

        <h2 className="volunteer-opportunities__title">
          <Link to={`/volunteer/manage/opportunities/${opportunity.id}`}>
            {opportunity.title}
          </Link>
        </h2>

        {opportunity.campaign_title && (
          <p className="volunteer-opportunities__campaign">
            Partnered with <strong>{opportunity.campaign_title}</strong>
          </p>
        )}

        <p className="volunteer-opportunities__desc">
          {opportunity.description}
        </p>

        <ul className="volunteer-opportunities__meta">
          <li>
            <Icon name="building" size={16} />
            <span>{opportunity.location}</span>
          </li>
          <li>
            <Icon name="calendar" size={16} />
            <span>{formatDateTime(opportunity.event_date)}</span>
          </li>
          <li>
            <Icon name="user" size={16} />
            <span>
              {opportunity.slots_available} slot{opportunity.slots_available === 1 ? '' : 's'} available
            </span>
          </li>
        </ul>

        <div className="volunteer-opportunities__card-cta">
          <Link to={`/volunteer/manage/opportunities/${opportunity.id}`}>
            <Button variant={isOpen && !application ? 'primary' : 'secondary'} size="md">
              {application ? 'View application' : isOpen ? 'View details' : 'View details'}
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------------- */
/*  Loading skeleton                                                          */
/* ------------------------------------------------------------------------- */

function OpportunitiesSkeleton() {
  return (
    <div className="volunteer-opportunities__skeleton">
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} variant="block" height={240} />
      ))}
    </div>
  );
}