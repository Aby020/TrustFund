import { useCallback, useEffect, useState } from 'react';
import { Badge, Button, Card, CardContent, EmptyState, ErrorState, Input, Select, Skeleton } from '@/components';
import { listAdminUsers } from '@/services/admin';
import { formatDate } from '@/utils/format';
import { ROLE_TONES } from '@/types/api';
import type { AdminUser, ApiError, Paginated, UserRole } from '@/types/api';
import { AdminPagination } from './admin-pagination';
import './admin-users.css';

const ROLE_OPTIONS: { label: string; value: UserRole | '' }[] = [
  { label: 'All roles', value: '' },
  { label: 'Donor', value: 'DONOR' },
  { label: 'Charity', value: 'CHARITY' },
  { label: 'Volunteer', value: 'VOLUNTEER' },
  { label: 'Admin', value: 'ADMIN' },
];

const ACTIVE_OPTIONS: { label: string; value: string }[] = [
  { label: 'All users', value: '' },
  { label: 'Active', value: 'true' },
  { label: 'Inactive', value: 'false' },
];

export default function AdminUsersPage() {
  const [users, setUsers] = useState<Paginated<AdminUser> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);

  const [search, setSearch] = useState('');
  const [role, setRole] = useState<UserRole | ''>('');
  const [isActive, setIsActive] = useState('');
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listAdminUsers({
        page,
        search: search || undefined,
        role: role || undefined,
        is_active: isActive || undefined,
      });
      setUsers(res);
    } catch (err) {
      setError(err as ApiError);
    } finally {
      setLoading(false);
    }
  }, [page, search, role, isActive]);

  useEffect(() => { load(); }, [load]);

  const totalPages = users ? Math.max(1, Math.ceil(users.count / 20)) : 1;

  return (
    <div className="admin-users">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-header__title">Users</h1>
          <p className="admin-page-header__subtitle">
            Every account on the TrustFund platform.
          </p>
        </div>
      </div>

      <div className="admin-filters">
        <Input
          type="search"
          placeholder="Search by name or email…"
          aria-label="Search users"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
        <Select
          value={role}
          aria-label="Filter by role"
          onChange={(e) => { setRole(e.target.value as UserRole | ''); setPage(1); }}
        >
          {ROLE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </Select>
        <Select
          value={isActive}
          aria-label="Filter by status"
          onChange={(e) => { setIsActive(e.target.value); setPage(1); }}
        >
          {ACTIVE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </Select>
      </div>

      {loading && <TableSkeleton cols={5} rows={4} />}

      {!loading && error && (
        <ErrorState
          title="Could not load users"
          description={error.message}
          actions={<Button variant="primary" onClick={load}>Try again</Button>}
        />
      )}

      {!loading && !error && users && users.results.length === 0 && (
        <Card><CardContent>
          <EmptyState title="No users found" description="Try adjusting your filters." />
        </CardContent></Card>
      )}

      {!loading && !error && users && users.results.length > 0 && (
        <>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th scope="col">User</th>
                  <th scope="col">Email</th>
                  <th scope="col">Role</th>
                  <th scope="col">Status</th>
                  <th scope="col">Joined</th>
                </tr>
              </thead>
              <tbody>
                {users.results.map((u) => (
                  <tr key={u.id}>
                    <td className="admin-users__name">{u.full_name || '—'}</td>
                    <td>{u.email}</td>
                    <td>
                      <Badge tone={ROLE_TONES[u.role]}>{u.role_display}</Badge>
                    </td>
                    <td>
                      <Badge tone={u.is_active ? 'success' : 'neutral'}>
                        {u.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td>{formatDate(u.date_joined)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <AdminPagination page={page} totalPages={totalPages} count={users.count} onChange={setPage} />
        </>
      )}
    </div>
  );
}

export function TableSkeleton({ cols, rows }: { cols: number; rows: number }) {
  return (
    <div className="admin-table-wrap">
      <table className="admin-table">
        <tbody>
          {Array.from({ length: rows }).map((_, r) => (
            <tr key={r}>
              {Array.from({ length: cols }).map((_, c) => (
                <td key={c}><Skeleton variant="text" width="120px" height={14} /></td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}