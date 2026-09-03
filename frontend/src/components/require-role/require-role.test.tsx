import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';
import { AuthProvider } from '@/context/auth-context';
import RequireRole from './require-role';
import type { UserRole } from '@/types/api';

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

function renderWithRole(
  userRole: UserRole | null,
  allowedRoles: UserRole[],
  initialEntries = ['/admin'],
) {
  if (userRole) {
    mockGetCurrentUser.mockResolvedValue({
      id: 1,
      email: 'test@example.com',
      first_name: 'Test',
      last_name: 'User',
      role: userRole,
    });
  } else {
    mockGetCurrentUser.mockRejectedValue(new Error('No session'));
  }

  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <AuthProvider>
        <Routes>
          <Route
            element={<RequireRole roles={allowedRoles} />}
          >
            <Route path="/admin" element={<div>Admin Content</div>} />
          </Route>
          <Route path="/dashboard" element={<div>Dashboard (fallback)</div>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

/* -------------------------------------------------------------------------- */
/*  Tests                                                                     */
/* -------------------------------------------------------------------------- */

describe('RequireRole', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders children when user has an allowed role', async () => {
    renderWithRole('ADMIN', ['ADMIN']);

    await waitFor(() => {
      expect(screen.getByText('Admin Content')).toBeInTheDocument();
    });
  });

  it('redirects to dashboard when user role is not allowed', async () => {
    renderWithRole('DONOR', ['ADMIN']);

    await waitFor(() => {
      expect(screen.getByText('Dashboard (fallback)')).toBeInTheDocument();
    });
  });

  it('accepts multiple allowed roles', async () => {
    renderWithRole('CHARITY', ['CHARITY', 'ADMIN']);

    await waitFor(() => {
      expect(screen.getByText('Admin Content')).toBeInTheDocument();
    });
  });

  it('rejects when user role is not in the list', async () => {
    renderWithRole('VOLUNTEER', ['ADMIN', 'CHARITY']);

    await waitFor(() => {
      expect(screen.getByText('Dashboard (fallback)')).toBeInTheDocument();
    });
  });

  it('redirects to custom redirectTo when specified', async () => {
    mockGetCurrentUser.mockResolvedValue({
      id: 1,
      email: 'test@example.com',
      first_name: 'Test',
      last_name: 'User',
      role: 'DONOR',
    });

    render(
      <MemoryRouter initialEntries={['/admin']}>
        <AuthProvider>
          <Routes>
            <Route element={<RequireRole roles={['ADMIN']} redirectTo="/unauthorized" />}>
              <Route path="/admin" element={<div>Admin</div>} />
            </Route>
            <Route path="/unauthorized" element={<div>Not Authorized</div>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('Not Authorized')).toBeInTheDocument();
    });
  });
});
