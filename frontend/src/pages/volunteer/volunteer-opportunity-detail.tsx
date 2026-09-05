import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  Badge,
  Button,
  Card,
  CardContent,
  Container,
  ErrorState,
  FormField,
  Icon,
  Skeleton,
  Textarea,
  useToast,
} from '@/components';
import { MotionReveal } from '@/components/motion/motion-reveal';
import { getOpportunity, listAllApplications, createApplication } from '@/services/volunteers';
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
import './volunteer-opportunity-detail.css';

/**
 * VolunteerOpportunityDetail — full details for one opportunity plus the
 * apply flow. The volunteer's own application (if any) is looked up from the
 * server-filtered application list, so they only ever see their own status.
 * Duplicate applications are guarded by the backend; a 400 on submit converts
 * to the applied state rather than surfacing a confusing error.
 */
export default function VolunteerOpportunityDetailPage() {
  const { id } = useParams<{ id: string }>();
  const opportunityId = Number(id);
  const { success, error: toastError } = useToast();

  const [opportunity, setOpportunity] = useState<VolunteerOpportunity | null>(null);
  const [application, setApplication] = useState<VolunteerApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);

  const [statement, setStatement] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const load = useCallback(async () => {
    if (!Number.isFinite(opportunityId)) {
      setError({ status: 400, message: 'Invalid opportunity.' });
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [opp, apps] = await Promise.all([
        getOpportunity(opportunityId),
        listAllApplications(),
      ]);
      setOpportunity(opp);
      setApplication(apps.find((a) => a.opportunity === opp.id) ?? null);
    } catch (err) {
      setError(err as ApiError);
    } finally {
      setLoading(false);
    }
  }, [opportunityId]);

  useEffect(() => {
    load();
  }, [load]);

  const isOpen = opportunity?.status === 'OPEN';

  async function handleApply(e: React.FormEvent) {
    e.preventDefault();
    if (!opportunity || submitting) return;
    setSubmitting(true);
    try {
      const created = await createApplication({
        opportunity: opportunity.id,
        statement: statement.trim() || undefined,
      });
      setApplication(created);
      setSubmitted(true);
      success('Application submitted');
    } catch (err) {
      const apiError = err as ApiError;
      // Backend rejects duplicates with 400 "You have already applied..."
      // — treat as already-applied rather than an error.
      if (
        apiError.status === 400 &&
        /already applied/i.test(apiError.message)
      ) {
        setSubmitted(true);
        try {
          const apps = await listAllApplications();
          setApplication(apps.find((a) => a.opportunity === opportunity.id) ?? null);
        } catch {
          /* best effort — the backend remains authoritative */
        }
        success('You have already applied to this opportunity');
      } else {
        toastError(apiError.message || 'Could not submit your application');
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="volunteer-opportunity-detail">
        <Container>
          <VolunteerNav />
          <div className="volunteer-opportunity-detail__skeleton">
            <Skeleton variant="block" height={220} />
            <Skeleton variant="block" height={260} />
          </div>
        </Container>
      </div>
    );
  }

  if (error || !opportunity) {
    return (
      <div className="volunteer-opportunity-detail">
        <Container>
          <VolunteerNav />
          <ErrorState
            title="Could not load this opportunity"
            description={error?.message ?? 'The opportunity could not be found.'}
            actions={
              <Button variant="primary" onClick={load}>
                Try again
              </Button>
            }
          />
        </Container>
      </div>
    );
  }

  return (
    <div className="volunteer-opportunity-detail">
      <Container>
        <MotionReveal>
          <VolunteerNav />
        </MotionReveal>

        <div className="volunteer-opportunity-detail__layout">
          <MotionReveal className="volunteer-opportunity-detail__main">
            <article className="volunteer-opportunity-detail__article">
              <div className="volunteer-opportunity-detail__head">
                <p className="volunteer-opportunity-detail__org">
                  {opportunity.charity_name}
                </p>
                <div className="volunteer-opportunity-detail__badges">
                  <Badge tone={OPPORTUNITY_STATUS_TONES[opportunity.status] as 'success' | 'neutral' | 'info'}>
                    {OPPORTUNITY_STATUS_LABELS[opportunity.status]}
                  </Badge>
                  {application && (
                    <Badge tone={APPLICATION_STATUS_TONES[application.status] as 'warning' | 'success' | 'danger' | 'info'}>
                      {APPLICATION_STATUS_LABELS[application.status]}
                    </Badge>
                  )}
                </div>
              </div>

              <h1 className="volunteer-opportunity-detail__title">
                {opportunity.title}
              </h1>

              {opportunity.campaign_title && (
                <p className="volunteer-opportunity-detail__campaign">
                  Part of the <strong>{opportunity.campaign_title}</strong> campaign
                </p>
              )}

              <ul className="volunteer-opportunity-detail__meta">
                <li>
                  <Icon name="building" size={18} />
                  <span>{opportunity.location}</span>
                </li>
                <li>
                  <Icon name="calendar" size={18} />
                  <span>{formatDateTime(opportunity.event_date)}</span>
                </li>
                <li>
                  <Icon name="user" size={18} />
                  <span>
                    {opportunity.slots_available} slot{opportunity.slots_available === 1 ? '' : 's'} available
                  </span>
                </li>
              </ul>

              <h2 className="volunteer-opportunity-detail__section-title">About this opportunity</h2>
              <p className="volunteer-opportunity-detail__desc">
                {opportunity.description}
              </p>
            </article>
          </MotionReveal>

          <MotionReveal className="volunteer-opportunity-detail__aside" delay={0.1}>
            {application ? (
              <ApplicationStatusCard application={application} justSubmitted={submitted} />
            ) : !isOpen ? (
              <Card>
                <CardContent>
                  <h2 className="volunteer-opportunity-detail__section-title">
                    {OPPORTUNITY_STATUS_LABELS[opportunity.status]}
                  </h2>
                  <p className="volunteer-opportunity-detail__closed-note">
                    This opportunity is no longer open for applications.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent>
                  <h2 className="volunteer-opportunity-detail__section-title">Apply to volunteer</h2>
                  <form onSubmit={handleApply} noValidate>
                      <FormField
                        htmlFor="volunteer-statement"
                        label="Why would you like to volunteer?"
                        hint="Optional — a short note helps the charity review your application."
                      >
                        {({ id }) => (
                          <Textarea
                            id={id}
                            rows={5}
                            value={statement}
                            onChange={(e) => setStatement(e.target.value)}
                            placeholder="Tell the charity a little about yourself..."
                          />
                        )}
                      </FormField>
                      <div className="volunteer-opportunity-detail__apply-actions">
                        <Button type="submit" variant="primary" size="md" disabled={submitting}>
                          {submitting ? 'Submitting…' : 'Submit application'}
                        </Button>
                      </div>
                    </form>
                </CardContent>
              </Card>
            )}
          </MotionReveal>
        </div>
      </Container>
    </div>
  );
}

/* ------------------------------------------------------------------------- */
/*  Applied status card                                                       */
/* ------------------------------------------------------------------------- */

function ApplicationStatusCard({
  application,
  justSubmitted = false,
}: {
  application: VolunteerApplication;
  justSubmitted?: boolean;
}) {
  return (
    <Card>
      <CardContent>
        {justSubmitted && (
          <div className="volunteer-opportunity-detail__success-banner">
            <span className="volunteer-opportunity-detail__success-icon" aria-hidden="true">
              <Icon name="check" size={20} />
            </span>
            <div>
              <p className="volunteer-opportunity-detail__success-title">
                Application submitted
              </p>
              <p className="volunteer-opportunity-detail__success-text">
                The charity will review your application. You can track its status
                from My Applications.
              </p>
            </div>
          </div>
        )}
        <h2 className="volunteer-opportunity-detail__section-title">Your application</h2>
        <div className="volunteer-opportunity-detail__app-status">
          <Badge tone={APPLICATION_STATUS_TONES[application.status] as 'warning' | 'success' | 'danger' | 'info'}>
            {APPLICATION_STATUS_LABELS[application.status]}
          </Badge>
          <p className="volunteer-opportunity-detail__app-text">
            {application.status === 'PENDING' &&
              'Your application is awaiting review by the charity.'}
            {application.status === 'APPROVED' &&
              'Great news — your application was approved. The charity will be in touch with details.'}
            {application.status === 'REJECTED' &&
              'The charity was unable to accept your application this time.'}
            {application.status === 'ATTENDED' &&
              'You attended this opportunity. Thank you for volunteering!'}
          </p>
        </div>
        {application.statement && (
          <div className="volunteer-opportunity-detail__statement">
            <p className="volunteer-opportunity-detail__statement-label">Your message</p>
            <p className="volunteer-opportunity-detail__statement-text">
              {application.statement}
            </p>
          </div>
        )}
        <Link
          to={`/volunteer/manage/applications/${application.id}`}
          className="volunteer-opportunity-detail__app-link"
        >
          <Button variant="secondary" size="md">
            View application details
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}