import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import { ToastProvider } from '@/components';
import { AuthProvider } from '@/context/auth-context';
import { AppRoutes } from '@/app/routes';
import type { UserRole } from '@/types/api';

/* -------------------------------------------------------------------------- */
/*  Mock the auth service so AuthProvider can restore a session per test.      */
/* -------------------------------------------------------------------------- */

const mockGetCurrentUser = vi.fn();

vi.mock('@/services/auth', () => ({
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
  getCurrentUser: (...args: unknown[]) => mockGetCurrentUser(...args),
  refreshAccessToken: vi.fn(),
  setSessionExpiredHandler: vi.fn(),
}));

/* -------------------------------------------------------------------------- */
/*  Stub the lazily-loaded admin page modules so route tests assert on         */
/*  routing behaviour — not page internals.                                    */
/* -------------------------------------------------------------------------- */

vi.mock('@/pages/admin/admin-dashboard', () => ({
  default: () => <div>Admin Dashboard</div>,
}));
vi.mock('@/pages/admin/admin-verifications-list', () => ({
  default: () => <div>Admin Verifications List</div>,
}));
vi.mock('@/pages/admin/admin-verification-detail', () => ({
  default: () => <div>Admin Verification Detail</div>,
}));
vi.mock('@/pages/admin/admin-users', () => ({
  default: () => <div>Admin Users</div>,
}));
vi.mock('@/pages/admin/admin-organizations', () => ({
  default: () => <div>Admin Organizations</div>,
}));
vi.mock('@/pages/admin/admin-campaigns', () => ({
  default: () => <div>Admin Campaigns</div>,
}));
vi.mock('@/pages/admin/admin-donations', () => ({
  default: () => <div>Admin Donations</div>,
}));
vi.mock('@/pages/admin/admin-audit-logs', () => ({
  default: () => <div>Admin Audit Logs</div>,
}));
vi.mock('@/pages/admin/admin-notifications', () => ({
  default: () => <div>Admin Notifications</div>,
}));

// Landing target for non-admin roles that are bounced away from admin routes.
vi.mock('@/pages/dashboard/dashboard', () => ({
  default: () => <div>Dashboard Redirect</div>,
}));

// Anonymous redirect lands on the login page (stubbed).
vi.mock('@/pages/auth/login/login', () => ({
  default: () => <div>Login Page</div>,
}));

/* -------------------------------------------------------------------------- */
/*  Harness                                                                    */
/* -------------------------------------------------------------------------- */

function renderAt(path: string, role: UserRole | null) {
  if (role) {
    mockGetCurrentUser.mockResolvedValue({
      id: 1,
      email: 'person@example.com',
      first_name: 'Test',
      last_name: 'User',
      role,
    });
  } else {
    mockGetCurrentUser.mockRejectedValue(new Error('No session'));
  }

  return render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        <ToastProvider>
          <AppRoutes />
        </ToastProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

/* -------------------------------------------------------------------------- */
/*  Tests                                                                      */
/* -------------------------------------------------------------------------- */

describe('Admin route protection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('allows an ADMIN to reach /admin/manage', async () => {
    renderAt('/admin/manage', 'ADMIN');
    await waitFor(() => {
      expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
    });
  });

  it('allows an ADMIN to reach /admin/manage/verifications', async () => {
    renderAt('/admin/manage/verifications', 'ADMIN');
    await waitFor(() => {
      expect(screen.getByText('Admin Verifications List')).toBeInTheDocument();
    });
  });

  it('allows an ADMIN to reach a verification detail route', async () => {
    renderAt('/admin/manage/verifications/3', 'ADMIN');
    await waitFor(() => {
      expect(screen.getByText('Admin Verification Detail')).toBeInTheDocument();
    });
  });

  it('allows an ADMIN to reach users, campaigns and audit-logs', async () => {
    renderAt('/admin/manage/users', 'ADMIN');
    await waitFor(() => expect(screen.getByText('Admin Users')).toBeInTheDocument());

    renderAt('/admin/manage/campaigns', 'ADMIN');
    await waitFor(() => expect(screen.getByText('Admin Campaigns')).toBeInTheDocument());

    renderAt('/admin/manage/audit-logs', 'ADMIN');
    await waitFor(() => expect(screen.getByText('Admin Audit Logs')).toBeInTheDocument());
  });

  it('blocks a DONOR from /admin/manage and redirects to the dashboard', async () => {
    renderAt('/admin/manage', 'DONOR');
    await waitFor(() => {
      expect(screen.getByText('Dashboard Redirect')).toBeInTheDocument();
    });
    expect(screen.queryByText('Admin Dashboard')).not.toBeInTheDocument();
  });

  it('blocks a CHARITY from /admin/manage/verifications', async () => {
    renderAt('/admin/manage/verifications', 'CHARITY');
    await waitFor(() => {
      expect(screen.getByText('Dashboard Redirect')).toBeInTheDocument();
    });
    expect(screen.queryByText('Admin Verifications List')).not.toBeInTheDocument();
  });

  it('blocks a VOLUNTEER from /admin/manage', async () => {
    renderAt('/admin/manage', 'VOLUNTEER');
    await waitFor(() => {
      expect(screen.getByText('Dashboard Redirect')).toBeInTheDocument();
    });
    expect(screen.queryByText('Admin Dashboard')).not.toBeInTheDocument();
  });

  it('blocks an unauthenticated visitor from /admin/manage and redirects to login', async () => {
    renderAt('/admin/manage', null);
    await waitFor(() => {
      expect(screen.getByText('Login Page')).toBeInTheDocument();
    });
    expect(screen.queryByText('Admin Dashboard')).not.toBeInTheDocument();
  });
});
