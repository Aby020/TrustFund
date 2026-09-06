import { useCallback, useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Badge,
  type BadgeTone,
  Button,
  Card,
  CardContent,
  Dialog,
  EmptyState,
  ErrorState,
  Icon,
  Skeleton,
  Textarea,
  useToast,
} from '@/components';
import { MotionReveal } from '@/components/motion/motion-reveal';
import {
  getOrganization,
  getVerificationHistory,
  approveVerification,
  rejectVerification,
} from '@/services/admin';
import { formatDateTime } from '@/utils/format';
import {
  VERIFICATION_STATUS_LABELS,
  VERIFICATION_STATUS_TONES,
} from '@/types/api';
import type {
  ApiError,
  CharityOrganization,
  VerificationHistoryEntry,
} from '@/types/api';
import './admin-verification-detail.css';

export default function AdminVerificationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const orgId = Number(id);
  const { success, error: toastError } = useToast();

  const [org, setOrg] = useState<CharityOrganization | null>(null);
  const [history, setHistory] = useState<VerificationHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);

  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [actionBusy, setActionBusy] = useState(false);

  const load = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    setError(null);
    try {
      const [orgData, histData] = await Promise.all([
        getOrganization(orgId),
        getVerificationHistory(orgId),
      ]);
      setOrg(orgData);
      setHistory(histData);
    } catch (err) {
      setError(err as ApiError);
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => { load(); }, [load]);

  const handleApprove = useCallback(async () => {
    if (!org || actionBusy) return;
    setActionBusy(true);
    try {
      const updated = await approveVerification(org.id);
      setOrg(updated);
      success('Organization approved', `${org.name} is now verified.`);
    } catch (err) {
      const apiErr = err as ApiError;
      toastError('Approval failed', apiErr.message);
    } finally {
      setActionBusy(false);
    }
  }, [org, actionBusy, success, toastError]);

  const handleReject = useCallback(async () => {
    if (!org || actionBusy || !rejectReason.trim()) return;
    setActionBusy(true);
    try {
      const updated = await rejectVerification(org.id, rejectReason.trim());
      setOrg(updated);
      setRejectOpen(false);
      setRejectReason('');
      success('Organization rejected', `${org.name} has been rejected.`);
    } catch (err) {
      const apiErr = err as ApiError;
      toastError('Rejection failed', apiErr.message);
    } finally {
      setActionBusy(false);
    }
  }, [org, actionBusy, rejectReason, success, toastError]);

  return (
    <div className="admin-verification-detail">
      <div className="admin-page-header">
        <div>
          <Link to="/admin/manage/verifications" className="admin-verification-detail__back">
            <Icon name="arrow-right" size={14} aria-hidden="true" style={{ transform: 'rotate(180deg)' }} />
            Back to verifications
          </Link>
          <h1 className="admin-page-header__title">{loading ? 'Verification review' : org?.name ?? 'Organization'}</h1>
          <p className="admin-page-header__subtitle">
            Review organization details, history, and take action.
          </p>
        </div>
        {!loading && org && org.verification_status === 'PENDING' && (
          <div className="admin-verification-detail__actions">
            <Button
              variant="danger"
              size="md"
              disabled={actionBusy}
              onClick={() => setRejectOpen(true)}
            >
              Reject
            </Button>
            <Button
              variant="primary"
              size="md"
              disabled={actionBusy}
              onClick={handleApprove}
            >
              {actionBusy ? 'Processing…' : 'Approve'}
            </Button>
          </div>
        )}
      </div>

      {loading && <DetailSkeleton />}

      {!loading && error && (
        <ErrorState
          title="Could not load organization"
          description={error.message}
          actions={<Button variant="primary" onClick={load}>Try again</Button>}
        />
      )}

      {!loading && !error && !org && (
        <EmptyState
          title="Organization not found"
          description="This organization may have been removed."
        />
      )}

      {!loading && !error && org && (
        <div className="admin-verification-detail__layout">
          <MotionReveal className="admin-verification-detail__main">
            <Card>
              <CardContent>
                <h2 className="admin-verification-detail__section-title">Organization information</h2>
                <dl className="admin-definition-list">
                  <dt>Name</dt>
                  <dd>{org.name}</dd>
                  <dt>Status</dt>
                  <dd>
                    <Badge tone={VERIFICATION_STATUS_TONES[org.verification_status] as BadgeTone}>
                      {VERIFICATION_STATUS_LABELS[org.verification_status]}
                    </Badge>
                  </dd>
                  <dt>Registration number</dt>
                  <dd>{org.registration_number || '—'}</dd>
                  <dt>Contact email</dt>
                  <dd>{org.email || '—'}</dd>
                  <dt>Contact phone</dt>
                  <dd>{org.phone || '—'}</dd>
                  <dt>Website</dt>
                  <dd>{org.website ? <a href={org.website} target="_blank" rel="noopener noreferrer">{org.website}</a> : '—'}</dd>
                  <dt>Address</dt>
                  <dd>{org.address || '—'}</dd>
                  <dt>Description</dt>
                  <dd>{org.description || '—'}</dd>
                  {org.rejection_reason && (
                    <>
                      <dt>Rejection reason</dt>
                      <dd className="admin-verification-detail__rejection">{org.rejection_reason}</dd>
                    </>
                  )}
                </dl>
              </CardContent>
            </Card>
          </MotionReveal>

          <MotionReveal className="admin-verification-detail__sidebar" delay={0.1}>
            <Card>
              <CardContent>
                <h2 className="admin-verification-detail__section-title">Verification history</h2>
                {history.length === 0 ? (
                  <p className="admin-verification-detail__empty-note">
                    No verification activity yet.
                  </p>
                ) : (
                  <ul className="admin-timeline">
                    {history.map((entry) => (
                      <li key={entry.id} className="admin-timeline__item">
                        <span className="admin-timeline__dot" aria-hidden="true" />
                        <div className="admin-timeline__content">
                          <p className="admin-timeline__title">
                            {entry.action_display}
                            {entry.performed_by_name ? ` — ${entry.performed_by_name}` : ''}
                          </p>
                          <p className="admin-timeline__meta">
                            {formatDateTime(entry.created_at)}
                          </p>
                          {entry.reason && (
                            <p className="admin-timeline__detail">{entry.reason}</p>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </MotionReveal>
        </div>
      )}

      <Dialog
        open={rejectOpen}
        onClose={() => { if (!actionBusy) { setRejectOpen(false); setRejectReason(''); } }}
        title="Reject organization"
        description={`Provide a reason for rejecting "${org?.name ?? ''}". The charity owner will see this reason.`}
        dismissible={!actionBusy}
        footer={
          <>
            <Button variant="ghost" size="sm" disabled={actionBusy} onClick={() => { setRejectOpen(false); setRejectReason(''); }}>
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              disabled={actionBusy || !rejectReason.trim()}
              onClick={handleReject}
            >
              {actionBusy ? 'Processing…' : 'Reject organization'}
            </Button>
          </>
        }
      >
        <Textarea
          aria-label="Rejection reason"
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          placeholder="Explain why this organization is being rejected…"
          rows={4}
        />
      </Dialog>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="admin-verification-detail__layout">
      <div className="admin-verification-detail__main">
        <Skeleton variant="block" height={320} />
      </div>
      <div className="admin-verification-detail__sidebar">
        <Skeleton variant="block" height={240} />
      </div>
    </div>
  );
}