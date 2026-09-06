import { useCallback, useEffect, useState } from 'react';
import { Badge, Button, Card, CardContent, EmptyState, ErrorState, Input, Select } from '@/components';
import { listAuditLogs } from '@/services/admin';
import { formatDateTime } from '@/utils/format';
import { AUDIT_ACTION_LABELS, AUDIT_ACTION_TONES } from '@/types/api';
import type { ApiError, AuditLog, Paginated } from '@/types/api';
import { AdminPagination } from './admin-pagination';
import { TableSkeleton } from './admin-users';
import './admin-audit-logs.css';

const ACTION_OPTIONS: { label: string; value: string }[] = [
  { label: 'All actions', value: '' },
  ...Object.entries(AUDIT_ACTION_LABELS).map(([value, label]) => ({ label, value })),
];

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<Paginated<AuditLog> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);

  const [search, setSearch] = useState('');
  const [action, setAction] = useState('');
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listAuditLogs({
        page,
        search: search || undefined,
        action: action || undefined,
      });
      setLogs(res);
    } catch (err) {
      setError(err as ApiError);
    } finally {
      setLoading(false);
    }
  }, [page, search, action]);

  useEffect(() => { load(); }, [load]);

  const totalPages = logs ? Math.max(1, Math.ceil(logs.count / 20)) : 1;

  return (
    <div className="admin-audit-logs">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-header__title">Audit logs</h1>
          <p className="admin-page-header__subtitle">
            A chronological record of platform actions.
          </p>
        </div>
      </div>

      <div className="admin-filters">
        <Input
          type="search"
          placeholder="Search resource or detail…"
          aria-label="Search audit logs"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
        <Select
          value={action}
          aria-label="Filter by action"
          onChange={(e) => { setAction(e.target.value); setPage(1); }}
        >
          {ACTION_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </Select>
      </div>

      {loading && <TableSkeleton cols={5} rows={4} />}

      {!loading && error && (
        <ErrorState
          title="Could not load audit logs"
          description={error.message}
          actions={<Button variant="primary" onClick={load}>Try again</Button>}
        />
      )}

      {!loading && !error && logs && logs.results.length === 0 && (
        <Card><CardContent>
          <EmptyState title="No audit log entries" description="Try adjusting your filters." />
        </CardContent></Card>
      )}

      {!loading && !error && logs && logs.results.length > 0 && (
        <>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th scope="col">Action</th>
                  <th scope="col">Actor</th>
                  <th scope="col">Resource</th>
                  <th scope="col">Detail</th>
                  <th scope="col">When</th>
                </tr>
              </thead>
              <tbody>
                {logs.results.map((log) => (
                  <tr key={log.id}>
                    <td>
                      <Badge tone={AUDIT_ACTION_TONES[log.action] ?? 'neutral'}>
                        {log.action_display || AUDIT_ACTION_LABELS[log.action] || log.action}
                      </Badge>
                    </td>
                    <td>{log.actor_name || 'System'}</td>
                    <td className="admin-audit-logs__resource">{log.resource_label}</td>
                    <td className="admin-audit-logs__detail">{log.detail || '—'}</td>
                    <td>{formatDateTime(log.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <AdminPagination page={page} totalPages={totalPages} count={logs.count} onChange={setPage} />
        </>
      )}
    </div>
  );
}