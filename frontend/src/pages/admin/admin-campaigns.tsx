import { useCallback, useEffect, useState } from 'react';
import { Badge, type BadgeTone, Button, Card, CardContent, EmptyState, ErrorState, Input, Select } from '@/components';
import { listAdminCampaigns } from '@/services/admin';
import { formatCurrency, formatDate } from '@/utils/format';
import {
  CAMPAIGN_STATUS_LABELS,
  CAMPAIGN_STATUS_TONES,
  CATEGORY_LABELS,
} from '@/types/api';
import type { ApiError, Campaign, CampaignCategory, CampaignStatus, Paginated } from '@/types/api';
import { AdminPagination } from './admin-pagination';
import { TableSkeleton } from './admin-users';
import './admin-campaigns.css';

const CATEGORY_OPTIONS: { label: string; value: CampaignCategory | '' }[] = [
  { label: 'All categories', value: '' },
  ...(Object.keys(CATEGORY_LABELS) as CampaignCategory[]).map((c) => ({
    label: CATEGORY_LABELS[c],
    value: c,
  })),
];

const STATUS_OPTIONS: { label: string; value: CampaignStatus | '' }[] = [
  { label: 'All statuses', value: '' },
  ...(Object.keys(CAMPAIGN_STATUS_LABELS) as CampaignStatus[]).map((s) => ({
    label: CAMPAIGN_STATUS_LABELS[s],
    value: s,
  })),
];

export default function AdminCampaignsPage() {
  const [campaigns, setCampaigns] = useState<Paginated<Campaign> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<CampaignCategory | ''>('');
  const [status, setStatus] = useState<CampaignStatus | ''>('');
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listAdminCampaigns({
        page,
        search: search || undefined,
        category: category || undefined,
        status: status || undefined,
      });
      setCampaigns(res);
    } catch (err) {
      setError(err as ApiError);
    } finally {
      setLoading(false);
    }
  }, [page, search, category, status]);

  useEffect(() => { load(); }, [load]);

  const totalPages = campaigns ? Math.max(1, Math.ceil(campaigns.count / 20)) : 1;

  return (
    <div className="admin-campaigns">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-header__title">Campaigns</h1>
          <p className="admin-page-header__subtitle">
            Every fundraising campaign across all organizations.
          </p>
        </div>
      </div>

      <div className="admin-filters">
        <Input
          type="search"
          placeholder="Search campaigns…"
          aria-label="Search campaigns"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
        <Select
          value={category}
          aria-label="Filter by category"
          onChange={(e) => { setCategory(e.target.value as CampaignCategory | ''); setPage(1); }}
        >
          {CATEGORY_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </Select>
        <Select
          value={status}
          aria-label="Filter by status"
          onChange={(e) => { setStatus(e.target.value as CampaignStatus | ''); setPage(1); }}
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </Select>
      </div>

      {loading && <TableSkeleton cols={5} rows={4} />}

      {!loading && error && (
        <ErrorState
          title="Could not load campaigns"
          description={error.message}
          actions={<Button variant="primary" onClick={load}>Try again</Button>}
        />
      )}

      {!loading && !error && campaigns && campaigns.results.length === 0 && (
        <Card><CardContent>
          <EmptyState title="No campaigns found" description="Try adjusting your filters." />
        </CardContent></Card>
      )}

      {!loading && !error && campaigns && campaigns.results.length > 0 && (
        <>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th scope="col">Campaign</th>
                  <th scope="col">Organization</th>
                  <th scope="col">Category</th>
                  <th scope="col">Raised</th>
                  <th scope="col">Status</th>
                  <th scope="col">Ends</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.results.map((c) => (
                  <tr key={c.id}>
                    <td className="admin-campaigns__title">{c.title}</td>
                    <td>{c.organization_name}</td>
                    <td>{c.category_display}</td>
                    <td>{formatCurrency(Number(c.raised_amount))}</td>
                    <td>
                      <Badge tone={CAMPAIGN_STATUS_TONES[c.status] as BadgeTone}>{c.status_display}</Badge>
                    </td>
                    <td>{c.end_date ? formatDate(c.end_date) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <AdminPagination page={page} totalPages={totalPages} count={campaigns.count} onChange={setPage} />
        </>
      )}
    </div>
  );
}