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
/*  Stub the lazily-loaded page modules so route tests assert on routing       */
/*  behaviour — not page internals.                                            */
/* -------------------------------------------------------------------------- */

vi.mock('@/pages/volunteer/volunteer-dashboard', () => ({
  default: () => <div>Volunteer Dashboard</div>,
}));
vi.mock('@/pages/volunteer/volunteer-opportunities', () => ({
  default: () => <div>Volunteer Opportunities</div>,
}));
vi.mock('@/pages/volunteer/volunteer-opportunity-detail', () => ({
  default: () => <div>Volunteer Opportunity Detail</div>,
}));
vi.mock('@/pages/volunteer/volunteer-applications', () => ({
  default: () => <div>Volunteer Applications</div>,
}));
vi.mock('@/pages/volunteer/volunteer-application-detail', () => ({
  default: () => <div>Volunteer Application Detail</div>,
}));
vi.mock('@/pages/volunteer/volunteer-notifications', () => ({
  default: () => <div>Volunteer Notifications</div>,
}));

// Landing targets for non-volunteer roles after they are bounced away.
vi.mock('@/pages/donor', () => ({
  DonorDashboardPage: () => <div>Donor Dashboard</div>,
}));
vi.mock('@/pages/charity/charity-dashboard', () => ({
  default: () => <div>Charity Dashboard</div>,
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

describe('Volunteer route protection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('allows a VOLUNTEER to reach /volunteer/manage', async () => {
    renderAt('/volunteer/manage', 'VOLUNTEER');
    await waitFor(() => {
      expect(screen.getByText('Volunteer Dashboard')).toBeInTheDocument();
    });
  });

  it('allows a VOLUNTEER to reach /volunteer/manage/applications', async () => {
    renderAt('/volunteer/manage/applications', 'VOLUNTEER');
    await waitFor(() => {
      expect(screen.getByText('Volunteer Applications')).toBeInTheDocument();
    });
  });

  it('blocks a DONOR from /volunteer/manage and redirects to the dashboard', async () => {
    renderAt('/volunteer/manage', 'DONOR');
    await waitFor(() => {
      expect(screen.getByText('Donor Dashboard')).toBeInTheDocument();
    });
    expect(screen.queryByText('Volunteer Dashboard')).not.toBeInTheDocument();
  });

  it('blocks a CHARITY from /volunteer/manage', async () => {
    renderAt('/volunteer/manage', 'CHARITY');
    await waitFor(() => {
      expect(screen.getByText('Charity Dashboard')).toBeInTheDocument();
    });
    expect(screen.queryByText('Volunteer Dashboard')).not.toBeInTheDocument();
  });

  it('blocks an unauthenticated visitor from /volunteer/manage and redirects to login', async () => {
    renderAt('/volunteer/manage', null);
    await waitFor(() => {
      expect(screen.getByText('Login Page')).toBeInTheDocument();
    });
    expect(screen.queryByText('Volunteer Dashboard')).not.toBeInTheDocument();
  });
});