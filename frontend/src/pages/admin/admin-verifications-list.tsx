import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge, type BadgeTone, Button, Card, CardContent, EmptyState, ErrorState, Icon, Skeleton } from '@/components';
import { MotionReveal } from '@/components/motion/motion-reveal';
import { listOrganizations } from '@/services/admin';
import { formatDate } from '@/utils/format';
import {
  VERIFICATION_STATUS_LABELS,
  VERIFICATION_STATUS_TONES,
} from '@/types/api';
import type { ApiError, CharityOrganization } from '@/types/api';
import './admin-verifications-list.css';

type StatusFilter = 'ALL' | 'PENDING' | 'VERIFIED' | 'REJECTED';

const STATUS_OPTIONS: { label: string; value: StatusFilter }[] = [
  { label: 'All', value: 'ALL' },
  { label: 'Pending', value: 'PENDING' },
  { label: 'Verified', value: 'VERIFIED' },
  { label: 'Rejected', value: 'REJECTED' },
];

export default function AdminVerificationsListPage() {
  const [orgs, setOrgs] = useState<CharityOrganization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('PENDING');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = statusFilter === 'ALL' ? {} : { status: statusFilter };
      const res = await listOrganizations(params);
      setOrgs(res);
    } catch (err) {
      setError(err as ApiError);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="admin-verifications-list">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-header__title">Organization verifications</h1>
          <p className="admin-page-header__subtitle">
            Review and approve charity organizations.
          </p>
        </div>
      </div>

      <div className="admin-filters" role="group" aria-label="Filter by status">
        {STATUS_OPTIONS.map((opt) => (
          <Button
            key={opt.value}
            variant={statusFilter === opt.value ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setStatusFilter(opt.value)}
          >
            {opt.label}
          </Button>
        ))}
      </div>

      {loading && <ListSkeleton />}

      {!loading && error && (
        <ErrorState
          title="Could not load organizations"
          description={error.message}
          actions={<Button variant="primary" onClick={load}>Try again</Button>}
        />
      )}

      {!loading && !error && orgs.length === 0 && (
        <Card>
          <CardContent>
            <EmptyState
              title="No organizations found"
              description={
                statusFilter === 'ALL'
                  ? 'There are no charity organizations yet.'
                  : `No organizations with status "${VERIFICATION_STATUS_LABELS[statusFilter] ?? statusFilter}".`
              }
            />
          </CardContent>
        </Card>
      )}

      {!loading && !error && orgs.length > 0 && (
        <MotionReveal>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th scope="col">Organization</th>
                  <th scope="col">Owner</th>
                  <th scope="col">Status</th>
                  <th scope="col">Submitted</th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {orgs.map((org) => (
                  <tr key={org.id}>
                    <td>
                      <div className="admin-verifications-list__org">
                        <span className="admin-verifications-list__org-name">{org.name}</span>
                        {org.registration_number && (
                          <span className="admin-verifications-list__org-meta">
                            Reg: {org.registration_number}
                          </span>
                        )}
                      </div>
                    </td>
                    <td>{org.owner_name || `User #${org.owner}`}</td>
                    <td>
                      <Badge tone={VERIFICATION_STATUS_TONES[org.verification_status] as BadgeTone}>
                        {VERIFICATION_STATUS_LABELS[org.verification_status]}
                      </Badge>
                    </td>
                    <td>{org.submitted_at ? formatDate(org.submitted_at) : '—'}</td>
                    <td>
                      <Link to={`/admin/manage/verifications/${org.id}`}>
                        <Button variant="outline" size="sm">
                          <Icon name="eye" size={14} aria-hidden="true" />
                          Review
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </MotionReveal>
      )}
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="admin-table-wrap">
      <table className="admin-table">
        <thead>
          <tr>
            <th scope="col">Organization</th>
            <th scope="col">Owner</th>
            <th scope="col">Status</th>
            <th scope="col">Submitted</th>
            <th scope="col">Actions</th>
          </tr>
        </thead>
        <tbody>
          {[0, 1, 2].map((i) => (
            <tr key={i}>
              <td><Skeleton variant="text" width="180px" height={16} /></td>
              <td><Skeleton variant="text" width="100px" height={16} /></td>
              <td><Skeleton variant="text" width="80px" height={16} /></td>
              <td><Skeleton variant="text" width="90px" height={16} /></td>
              <td><Skeleton variant="text" width="70px" height={16} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}