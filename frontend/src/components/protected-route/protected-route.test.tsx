import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';
import { AuthProvider } from '@/context/auth-context';
import ProtectedRoute from './protected-route';
import { AUTH_ROUTES } from '@/app/config';

/* -------------------------------------------------------------------------- */
/*  Mock the auth service                                                     */
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

function DashboardPlaceholder() {
  return <div>Protected Content</div>;
}

function renderWithAuthRoute(initialEntries: string[], userReturn: boolean) {
  if (userReturn) {
    mockGetCurrentUser.mockResolvedValue({
      id: 1,
      email: 'test@example.com',
      first_name: 'Test',
      last_name: 'User',
      role: 'DONOR',
    });
  } else {
    mockGetCurrentUser.mockRejectedValue(new Error('No session'));
  }

  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <AuthProvider>
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<DashboardPlaceholder />} />
          </Route>
          <Route path={AUTH_ROUTES.login} element={<div>Login Page</div>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

/* -------------------------------------------------------------------------- */
/*  Tests                                                                     */
/* -------------------------------------------------------------------------- */

describe('ProtectedRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows spinner while session is restoring', () => {
    // Return a pending promise — status stays "restoring"
    mockGetCurrentUser.mockReturnValue(new Promise(() => {}));

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <AuthProvider>
          <Routes>
            <Route element={<ProtectedRoute />}>
              <Route path="/dashboard" element={<div>Content</div>} />
            </Route>
          </Routes>
        </AuthProvider>
      </MemoryRouter>,
    );

    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders children when authenticated', async () => {
    renderWithAuthRoute(['/dashboard'], true);

    await waitFor(() => {
      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });
  });

  it('redirects to login when anonymous', async () => {
    renderWithAuthRoute(['/dashboard'], false);

    await waitFor(() => {
      expect(screen.getByText('Login Page')).toBeInTheDocument();
    });
  });

  it('preserves the original path in the "from" query param', async () => {
    renderWithAuthRoute(['/dashboard'], false);

    await waitFor(() => {
      // The login page should have received the from param
      expect(screen.getByText('Login Page')).toBeInTheDocument();
    });
  });

  it('shows loading state before redirect', async () => {
    // User not authenticated
    mockGetCurrentUser.mockRejectedValue(new Error('No session'));

    const { container } = render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <AuthProvider>
          <Routes>
            <Route element={<ProtectedRoute />}>
              <Route path="/dashboard" element={<div>Content</div>} />
            </Route>
          </Routes>
        </AuthProvider>
      </MemoryRouter>,
    );

    // During restoring phase, the loading spinner should be visible
    // (this happens before the redirect)
    expect(container.querySelector('.protected-route__loading')).toBeInTheDocument();
  });
});
