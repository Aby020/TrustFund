import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge, type BadgeTone, Button, Card, CardContent, EmptyState, ErrorState, Icon } from '@/components';
import { listOrganizations } from '@/services/admin';
import { formatDate } from '@/utils/format';
import {
  VERIFICATION_STATUS_LABELS,
  VERIFICATION_STATUS_TONES,
} from '@/types/api';
import type { ApiError, CharityOrganization } from '@/types/api';
import { TableSkeleton } from './admin-users';
import './admin-organizations.css';

export default function AdminOrganizationsPage() {
  const [orgs, setOrgs] = useState<CharityOrganization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setOrgs(await listOrganizations());
    } catch (err) {
      setError(err as ApiError);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="admin-organizations">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-header__title">Organizations</h1>
          <p className="admin-page-header__subtitle">
            All charity organizations on the platform.
          </p>
        </div>
        <Link to="/admin/manage/verifications">
          <Button variant="secondary" size="md">
            <Icon name="shield" size={16} aria-hidden="true" />
            Verifications
          </Button>
        </Link>
      </div>

      {loading && <TableSkeleton cols={5} rows={4} />}

      {!loading && error && (
        <ErrorState
          title="Could not load organizations"
          description={error.message}
          actions={<Button variant="primary" onClick={load}>Try again</Button>}
        />
      )}

      {!loading && !error && orgs.length === 0 && (
        <Card><CardContent>
          <EmptyState title="No organizations yet" description="Charity organizations will appear here." />
        </CardContent></Card>
      )}

      {!loading && !error && orgs.length > 0 && (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th scope="col">Organization</th>
                <th scope="col">Owner</th>
                <th scope="col">Email</th>
                <th scope="col">Status</th>
                <th scope="col">Submitted</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {orgs.map((org) => (
                <tr key={org.id}>
                  <td className="admin-organizations__name">{org.name}</td>
                  <td>{org.owner_name || `User #${org.owner}`}</td>
                  <td>{org.email}</td>
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
                        View
                      </Button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}