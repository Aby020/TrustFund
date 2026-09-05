import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  Badge,
  Button,
  Container,
  EmptyState,
  ErrorState,
  Icon,
  Select,
  Skeleton,
} from '@/components';
import { MotionReveal } from '@/components/motion/motion-reveal';
import { fadeUp, staggerContainer } from '@/components/motion/variants';
import { listAllApplications, listAllOpportunities } from '@/services/volunteers';
import { formatDate, formatDateTime } from '@/utils/format';
import {
  APPLICATION_STATUS_LABELS,
  APPLICATION_STATUS_TONES,
} from '@/types/api';
import type {
  ApiError,
  VolunteerApplication,
  VolunteerOpportunity,
} from '@/types/api';
import { VolunteerNav } from './volunteer-nav';
import './volunteer-applications.css';

const STATUS_OPTIONS = [
  { value: 'ALL', label: 'All statuses' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'ATTENDED', label: 'Attended' },
] as const;

/**
 * VolunteerApplications — the volunteer's own applications. The list is
 * server-filtered to the current user, and opportunity details are joined
 * locally via the opportunity id so the volunteer sees the organization and
 * event date without any cross-user data exposure.
 */
export default function VolunteerApplicationsPage() {
  const [applications, setApplications] = useState<VolunteerApplication[]>([]);
  const [opportunities, setOpportunities] = useState<VolunteerOpportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);
  const [status, setStatus] = useState<string>('ALL');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [apps, opps] = await Promise.all([
        listAllApplications(),
        listAllOpportunities(),
      ]);
      setApplications(apps);
      setOpportunities(opps);
    } catch (err) {
      setError(err as ApiError);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const opportunityById = useMemo(() => {
    const map = new Map<number, VolunteerOpportunity>();
    for (const opp of opportunities) map.set(opp.id, opp);
    return map;
  }, [opportunities]);

  const filtered = useMemo(
    () =>
      applications.filter((a) => (status === 'ALL' ? true : a.status === status)),
    [applications, status],
  );

  const sorted = useMemo(
    () =>
      [...filtered].sort(
        (a, b) => new Date(b.applied_at).getTime() - new Date(a.applied_at).getTime(),
      ),
    [filtered],
  );

  return (
    <div className="volunteer-applications">
      <Container>
        <MotionReveal>
          <VolunteerNav />
        </MotionReveal>

        <MotionReveal className="volunteer-applications__header">
          <div>
            <p className="volunteer-applications__overline">Volunteering</p>
            <h1 className="volunteer-applications__title">My applications</h1>
            <p className="volunteer-applications__subtitle">
              Track the status of every opportunity you have applied to.
            </p>
          </div>
          <Link to="/volunteer/manage/opportunities">
            <Button variant="primary" size="md">
              Discover opportunities
            </Button>
          </Link>
        </MotionReveal>

        {!loading && !error && applications.length > 0 && (
          <MotionReveal className="volunteer-applications__filter">
            <Select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              aria-label="Filter applications by status"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Select>
          </MotionReveal>
        )}

        {loading && <ApplicationsSkeleton />}

        {!loading && error && (
          <ErrorState
            title="Could not load your applications"
            description={error.message}
            actions={
              <Button variant="primary" onClick={load}>
                Try again
              </Button>
            }
          />
        )}

        {!loading && !error && applications.length === 0 && (
          <EmptyState
            title="No applications yet"
            description="When you apply to an opportunity, it will appear here so you can track its status."
            action={
              <Link to="/volunteer/manage/opportunities">
                <Button variant="primary">Discover opportunities</Button>
              </Link>
            }
          />
        )}

        {!loading && !error && applications.length > 0 && sorted.length === 0 && (
          <EmptyState
            title="No applications with this status"
            description="Try a different status filter."
          />
        )}

        {!loading && !error && sorted.length > 0 && (
          <motion.ul
            className="volunteer-applications__list"
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
          >
            {sorted.map((app) => (
              <motion.li key={app.id} variants={fadeUp}>
                <ApplicationRow application={app} opportunity={opportunityById.get(app.opportunity)} />
              </motion.li>
            ))}
          </motion.ul>
        )}
      </Container>
    </div>
  );
}

/* ------------------------------------------------------------------------- */
/*  Application row                                                           */
/* ------------------------------------------------------------------------- */

function ApplicationRow({
  application,
  opportunity,
}: {
  application: VolunteerApplication;
  opportunity?: VolunteerOpportunity;
}) {
  return (
    <Link
      to={`/volunteer/manage/applications/${application.id}`}
      className="volunteer-applications__row"
    >
      <span className="volunteer-applications__icon" aria-hidden="true">
        <Icon name="receipt" size={20} />
      </span>
      <div className="volunteer-applications__main">
        <span className="volunteer-applications__title">
          {application.opportunity_title}
        </span>
        <span className="volunteer-applications__org">
          {opportunity?.charity_name ?? application.volunteer_name}
        </span>
        <span className="volunteer-applications__meta">
          Applied {formatDate(application.applied_at)}
          {opportunity && ` · ${formatDateTime(opportunity.event_date)}`}
          {opportunity && ` · ${opportunity.location}`}
        </span>
      </div>
      <Badge tone={APPLICATION_STATUS_TONES[application.status] as 'warning' | 'success' | 'danger' | 'info'}>
        {APPLICATION_STATUS_LABELS[application.status]}
      </Badge>
    </Link>
  );
}

/* ------------------------------------------------------------------------- */
/*  Loading skeleton                                                          */
/* ------------------------------------------------------------------------- */

function ApplicationsSkeleton() {
  return (
    <div className="volunteer-applications__skeleton">
      {[0, 1, 2, 3].map((i) => (
        <Skeleton key={i} variant="block" height={88} />
      ))}
    </div>
  );
}