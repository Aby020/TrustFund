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
/*  Stub lazily-loaded page modules so tests assert on routing behaviour —   */
/*  not page internals.                                                        */
/* -------------------------------------------------------------------------- */

vi.mock('@/pages/home/home', () => ({ default: () => <div>Home Page</div> }));
vi.mock('@/pages/charities/charities', () => ({ default: () => <div>Charities Page</div> }));
vi.mock('@/pages/how-it-works/how-it-works', () => ({ default: () => <div>How It Works Page</div> }));
vi.mock('@/pages/campaigns/campaign-discovery', () => ({
  default: () => <div>Campaigns Page</div>,
}));
vi.mock('@/pages/not-found/not-found', () => ({ default: () => <div>Not Found Page</div> }));
vi.mock('@/pages/auth/login/login', () => ({ default: () => <div>Login Page</div> }));
vi.mock('@/pages/dashboard/dashboard', () => ({ default: () => <div>Dashboard Page</div> }));

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

describe('Public navigation targets', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('serves /campaigns anonymously', async () => {
    renderAt('/campaigns', null);
    await waitFor(() => expect(screen.getByText('Campaigns Page')).toBeInTheDocument());
  });

  it('serves /charities anonymously (no 404)', async () => {
    renderAt('/charities', null);
    await waitFor(() => expect(screen.getByText('Charities Page')).toBeInTheDocument());
    expect(screen.queryByText('Not Found Page')).not.toBeInTheDocument();
  });

  it('serves /how-it-works anonymously (no 404)', async () => {
    renderAt('/how-it-works', null);
    await waitFor(() => expect(screen.getByText('How It Works Page')).toBeInTheDocument());
    expect(screen.queryByText('Not Found Page')).not.toBeInTheDocument();
  });

  it('renders the intended 404 page for an unknown path', async () => {
    renderAt('/this/route/does-not-exist', null);
    await waitFor(() => expect(screen.getByText('Not Found Page')).toBeInTheDocument());
  });

  it('keeps authenticated navigation working (/dashboard for a donor)', async () => {
    renderAt('/dashboard', 'DONOR');
    await waitFor(() => expect(screen.getByText('Dashboard Page')).toBeInTheDocument());
  });

  it('redirects anonymous visitors away from /dashboard to login', async () => {
    renderAt('/dashboard', null);
    await waitFor(() => expect(screen.getByText('Login Page')).toBeInTheDocument());
    expect(screen.queryByText('Dashboard Page')).not.toBeInTheDocument();
  });
});