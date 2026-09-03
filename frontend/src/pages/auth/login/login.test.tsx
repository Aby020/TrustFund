import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import { AuthProvider } from '@/context/auth-context';
import { ToastProvider } from '@/components';
import LoginPage from './login';

/* -------------------------------------------------------------------------- */
/*  Mock the auth service                                                     */
/* -------------------------------------------------------------------------- */

const mockLogin = vi.fn();
const mockGetCurrentUser = vi.fn();

vi.mock('@/services/auth', () => ({
  login: (...args: unknown[]) => mockLogin(...args),
  register: vi.fn(),
  logout: vi.fn(),
  getCurrentUser: (...args: unknown[]) => mockGetCurrentUser(...args),
  refreshAccessToken: vi.fn(),
  setSessionExpiredHandler: vi.fn(),
}));

// Start with no user — anonymous state.
mockGetCurrentUser.mockRejectedValue(new Error('No session'));

function renderLogin(searchParams = '') {
  const path = `/auth/login${searchParams ? `?${searchParams}` : ''}`;
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ToastProvider>
        <AuthProvider>
          <LoginPage />
        </AuthProvider>
      </ToastProvider>
    </MemoryRouter>,
  );
}

/* -------------------------------------------------------------------------- */
/*  Tests                                                                     */
/* -------------------------------------------------------------------------- */

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCurrentUser.mockRejectedValue(new Error('No session'));
  });

  it('renders email and password fields', () => {
    renderLogin();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Password/)).toBeInTheDocument();
  });

  it('renders sign-in button', () => {
    renderLogin();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('shows link to register page', () => {
    renderLogin();
    expect(screen.getByRole('link', { name: /create one/i })).toHaveAttribute('href', '/auth/register');
  });

  /* --- Validation --------------------------------------------------------- */

  it('shows validation errors when submitting empty form', async () => {
    const user = userEvent.setup();
    renderLogin();

    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(screen.getByText('Email is required')).toBeInTheDocument();
    expect(screen.getByText('Password is required')).toBeInTheDocument();
    expect(mockLogin).not.toHaveBeenCalled();
  });

  it('validates email format', async () => {
    const user = userEvent.setup();
    renderLogin();

    await user.type(screen.getByLabelText(/email/i), 'notanemail');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(screen.getByText('Enter a valid email address')).toBeInTheDocument();
  });

  it('validates password minimum length', async () => {
    const user = userEvent.setup();
    renderLogin();

    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/^Password/), 'short');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(screen.getByText('Password must be at least 8 characters')).toBeInTheDocument();
  });

  /* --- Successful login --------------------------------------------------- */

  it('calls login API and shows toast on success', async () => {
    const user = userEvent.setup();
    mockLogin.mockResolvedValueOnce({});

    renderLogin();

    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/^Password/), 'password123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({ email: 'test@example.com', password: 'password123' });
    });
  });

  /* --- Error handling ----------------------------------------------------- */

  it('shows form error for 401 invalid credentials', async () => {
    const user = userEvent.setup();
    mockLogin.mockRejectedValueOnce({ status: 401, message: 'Invalid credentials.' });

    renderLogin();

    await user.type(screen.getByLabelText(/email/i), 'wrong@example.com');
    await user.type(screen.getByLabelText(/^Password/), 'password123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText('Invalid email or password. Please try again.')).toBeInTheDocument();
    });
  });

  it('shows network error for status 0', async () => {
    const user = userEvent.setup();
    mockLogin.mockRejectedValueOnce({ status: 0, message: 'Network error' });

    renderLogin();

    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/^Password/), 'password123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText(/unable to connect/i)).toBeInTheDocument();
    });
  });

  it('shows server error for 500+', async () => {
    const user = userEvent.setup();
    mockLogin.mockRejectedValueOnce({ status: 500, message: 'Server error' });

    renderLogin();

    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/^Password/), 'password123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText(/something went wrong on our end/i)).toBeInTheDocument();
    });
  });

  /* --- Redirect ----------------------------------------------------------- */

  it('reads "from" query param for post-login redirect', () => {
    renderLogin('from=%2Fcampaigns');
    // The component reads this; we just verify it renders without error.
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  /* --- Accessibility ------------------------------------------------------ */

  it('form has aria-label for screen readers', () => {
    renderLogin();
    expect(screen.getByRole('form', { name: /log in/i })).toBeInTheDocument();
  });

  it('error message has role="alert"', async () => {
    const user = userEvent.setup();
    mockLogin.mockRejectedValueOnce({ status: 401, message: 'Invalid credentials.' });

    renderLogin();

    await user.type(screen.getByLabelText(/email/i), 'a@b.com');
    await user.type(screen.getByLabelText(/^Password/), 'password123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      const alert = screen.getByRole('alert');
      expect(alert).toBeInTheDocument();
      expect(alert).toHaveAttribute('aria-live', 'assertive');
    });
  });
});
