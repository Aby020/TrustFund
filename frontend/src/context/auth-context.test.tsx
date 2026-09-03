import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import { AuthProvider, useAuth } from './auth-context';

/* -------------------------------------------------------------------------- */
/*  Mock the auth service                                                     */
/* -------------------------------------------------------------------------- */

const mockLogin = vi.fn();
const mockRegister = vi.fn();
const mockLogout = vi.fn();
const mockGetCurrentUser = vi.fn();
const mockSetSessionExpiredHandler = vi.fn();

vi.mock('@/services/auth', () => ({
  login: (...args: unknown[]) => mockLogin(...args),
  register: (...args: unknown[]) => mockRegister(...args),
  logout: (...args: unknown[]) => mockLogout(...args),
  getCurrentUser: (...args: unknown[]) => mockGetCurrentUser(...args),
  refreshAccessToken: vi.fn(),
  setSessionExpiredHandler: (...args: unknown[]) => mockSetSessionExpiredHandler(...args),
}));

/* -------------------------------------------------------------------------- */
/*  Test consumer component                                                   */
/* -------------------------------------------------------------------------- */

function AuthConsumer() {
  const { status, user, login, register, logout } = useAuth();

  return (
    <div>
      <span data-testid="status">{status}</span>
      <span data-testid="user">{user ? `${user.firstName} ${user.lastName} (${user.role})` : 'null'}</span>
      <button onClick={() => login('a@b.com', 'pass')}>Login</button>
      <button onClick={() => register({ email: 'a@b.com', password: 'pass', firstName: 'J', lastName: 'D', role: 'CHARITY' })}>Register</button>
      <button onClick={() => logout()}>Logout</button>
    </div>
  );
}

function renderAuth(initialUser: boolean) {
  if (initialUser) {
    mockGetCurrentUser.mockResolvedValue({
      id: 1,
      email: 'a@b.com',
      first_name: 'Jane',
      last_name: 'Doe',
      role: 'DONOR',
    });
  } else {
    mockGetCurrentUser.mockRejectedValue(new Error('No session'));
  }

  return render(
    <MemoryRouter>
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>
    </MemoryRouter>,
  );
}

/* -------------------------------------------------------------------------- */
/*  Tests                                                                     */
/* -------------------------------------------------------------------------- */

describe('AuthProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /* --- Session restoration ------------------------------------------------- */

  it('starts in restoring state', () => {
    mockGetCurrentUser.mockReturnValue(new Promise(() => {}));

    render(
      <MemoryRouter>
        <AuthProvider>
          <AuthConsumer />
        </AuthProvider>
      </MemoryRouter>,
    );

    expect(screen.getByTestId('status')).toHaveTextContent('restoring');
  });

  it('restores session from stored tokens', async () => {
    renderAuth(true);

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('authenticated');
    });
    expect(screen.getByTestId('user')).toHaveTextContent('Jane Doe (DONOR)');
  });

  it('stays anonymous when no valid session exists', async () => {
    renderAuth(false);

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('anonymous');
    });
    expect(screen.getByTestId('user')).toHaveTextContent('null');
  });

  /* --- Login --------------------------------------------------------------- */

  it('sets user on successful login', async () => {
    const user = userEvent.setup();
    renderAuth(false);

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('anonymous');
    });

    mockLogin.mockResolvedValueOnce({
      user: { id: 1, email: 'a@b.com', first_name: 'J', last_name: 'D', role: 'DONOR' },
    });

    await act(async () => {
      await user.click(screen.getByRole('button', { name: /login/i }));
    });

    expect(screen.getByTestId('status')).toHaveTextContent('authenticated');
    expect(mockLogin).toHaveBeenCalledWith({ email: 'a@b.com', password: 'pass' });
  });

  /* --- Register ------------------------------------------------------------ */

  it('sets user on successful registration', async () => {
    const user = userEvent.setup();
    renderAuth(false);

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('anonymous');
    });

    mockRegister.mockResolvedValueOnce({
      user: { id: 2, email: 'a@b.com', first_name: 'J', last_name: 'D', role: 'CHARITY' },
    });

    await act(async () => {
      await user.click(screen.getByRole('button', { name: /register/i }));
    });

    expect(screen.getByTestId('status')).toHaveTextContent('authenticated');
    expect(mockRegister).toHaveBeenCalledWith({
      email: 'a@b.com',
      password: 'pass',
      first_name: 'J',
      last_name: 'D',
      role: 'CHARITY',
    });
  });

  /* --- Logout -------------------------------------------------------------- */

  it('clears user on logout', async () => {
    const user = userEvent.setup();
    renderAuth(true);

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('authenticated');
    });

    mockLogout.mockResolvedValueOnce(undefined);

    await act(async () => {
      await user.click(screen.getByRole('button', { name: /logout/i }));
    });

    expect(screen.getByTestId('status')).toHaveTextContent('anonymous');
    expect(screen.getByTestId('user')).toHaveTextContent('null');
  });

  /* --- Session expiry handler ---------------------------------------------- */

  it('registers a session-expired handler', async () => {
    renderAuth(false);
    await waitFor(() => {
      expect(mockSetSessionExpiredHandler).toHaveBeenCalled();
    });
  });
});
