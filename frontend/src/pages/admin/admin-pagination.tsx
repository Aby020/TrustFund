import { Button } from '@/components';

interface AdminPaginationProps {
  page: number;
  totalPages: number;
  count: number;
  onChange: (page: number) => void;
}

/** AdminPagination — shared prev/next pagination row for admin tables. */
export function AdminPagination({ page, totalPages, count, onChange }: AdminPaginationProps) {
  return (
    <nav className="admin-pagination" aria-label="Pagination">
      <span>
        {count} item{count === 1 ? '' : 's'}
      </span>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => onChange(page - 1)}>
          Previous
        </Button>
        <span>
          Page {page} of {totalPages}
        </span>
        <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>
          Next
        </Button>
      </div>
    </nav>
  );
}