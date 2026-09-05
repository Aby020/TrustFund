import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  Badge,
  Button,
  Card,
  CardContent,
  Container,
  ErrorState,
  Icon,
  Skeleton,
} from '@/components';
import { MotionReveal } from '@/components/motion/motion-reveal';
import { getApplication, getOpportunity } from '@/services/volunteers';
import { formatDate, formatDateTime } from '@/utils/format';
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
import './volunteer-application-detail.css';

/**
 * VolunteerApplicationDetail — one application. Ownership is enforced by the
 * backend (the retrieve view rejects non-owners), so a volunteer can only
 * ever see their own application here.
 */
export default function VolunteerApplicationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const applicationId = Number(id);

  const [application, setApplication] = useState<VolunteerApplication | null>(null);
  const [opportunity, setOpportunity] = useState<VolunteerOpportunity | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);

  const load = useCallback(async () => {
    if (!Number.isFinite(applicationId)) {
      setError({ status: 400, message: 'Invalid application.' });
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const app = await getApplication(applicationId);
      setApplication(app);
      try {
        const opp = await getOpportunity(app.opportunity);
        setOpportunity(opp);
      } catch {
        setOpportunity(null);
      }
    } catch (err) {
      setError(err as ApiError);
    } finally {
      setLoading(false);
    }
  }, [applicationId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="volunteer-application-detail">
        <Container>
          <VolunteerNav />
          <div className="volunteer-application-detail__skeleton">
            <Skeleton variant="block" height={220} />
          </div>
        </Container>
      </div>
    );
  }

  if (error || !application) {
    return (
      <div className="volunteer-application-detail">
        <Container>
          <VolunteerNav />
          <ErrorState
            title="Could not load this application"
            description={error?.message ?? 'The application could not be found.'}
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

  const statusLabel = APPLICATION_STATUS_LABELS[application.status];

  return (
    <div className="volunteer-application-detail">
      <Container>
        <MotionReveal>
          <VolunteerNav />
        </MotionReveal>

        <MotionReveal className="volunteer-application-detail__header">
          <div>
            <p className="volunteer-application-detail__overline">
              Application · {statusLabel}
            </p>
            <h1 className="volunteer-application-detail__title">
              {application.opportunity_title}
            </h1>
            <p className="volunteer-application-detail__subtitle">
              Submitted {formatDate(application.applied_at)}
            </p>
          </div>
          <Badge tone={APPLICATION_STATUS_TONES[application.status] as 'warning' | 'success' | 'danger' | 'info'}>
            {statusLabel}
          </Badge>
        </MotionReveal>

        <div className="volunteer-application-detail__layout">
          <Card>
            <CardContent>
              <h2 className="volunteer-application-detail__section-title">
                Application details
              </h2>

              <dl className="volunteer-application-detail__rows">
                <div className="volunteer-application-detail__row">
                  <dt>Opportunity</dt>
                  <dd>
                    <Link to={`/volunteer/manage/opportunities/${application.opportunity}`}>
                      {application.opportunity_title}
                    </Link>
                  </dd>
                </div>
                {opportunity && (
                  <>
                    <div className="volunteer-application-detail__row">
                      <dt>Organization</dt>
                      <dd>{opportunity.charity_name}</dd>
                    </div>
                    <div className="volunteer-application-detail__row">
                      <dt>Location</dt>
                      <dd>{opportunity.location}</dd>
                    </div>
                    <div className="volunteer-application-detail__row">
                      <dt>Event date</dt>
                      <dd>{formatDateTime(opportunity.event_date)}</dd>
                    </div>
                    <div className="volunteer-application-detail__row">
                      <dt>Opportunity status</dt>
                      <dd>
                        <Badge tone={OPPORTUNITY_STATUS_TONES[opportunity.status] as 'success' | 'neutral' | 'info'}>
                          {OPPORTUNITY_STATUS_LABELS[opportunity.status]}
                        </Badge>
                      </dd>
                    </div>
                  </>
                )}
                <div className="volunteer-application-detail__row">
                  <dt>Submitted</dt>
                  <dd>{formatDate(application.applied_at)}</dd>
                </div>
              </dl>

              {application.statement && (
                <div className="volunteer-application-detail__statement">
                  <p className="volunteer-application-detail__statement-label">
                    Your message to the charity
                  </p>
                  <p className="volunteer-application-detail__statement-text">
                    {application.statement}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="volunteer-application-detail__status-card">
            <CardContent>
              <span className="volunteer-application-detail__status-icon" aria-hidden="true">
                <Icon name="receipt" size={20} />
              </span>
              <h2 className="volunteer-application-detail__section-title">Status</h2>
              <Badge tone={APPLICATION_STATUS_TONES[application.status] as 'warning' | 'success' | 'danger' | 'info'}>
                {statusLabel}
              </Badge>
              <p className="volunteer-application-detail__status-text">
                {application.status === 'PENDING' &&
                  'The charity has not reviewed your application yet. You will be notified when it does.'}
                {application.status === 'APPROVED' &&
                  'Your application was approved. The charity will reach out with the next steps.'}
                {application.status === 'REJECTED' &&
                  'The charity was unable to accept your application this time. Keep an eye out for other opportunities.'}
                {application.status === 'ATTENDED' &&
                  'You attended this opportunity. Thank you for volunteering!'}
              </p>
            </CardContent>
          </Card>
        </div>
      </Container>
    </div>
  );
}