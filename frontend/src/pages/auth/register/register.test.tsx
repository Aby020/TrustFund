import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import { AuthProvider } from '@/context/auth-context';
import { ToastProvider } from '@/components';
import RegisterPage from './register';

/* -------------------------------------------------------------------------- */
/*  Mock the auth service                                                     */
/* -------------------------------------------------------------------------- */

const mockRegister = vi.fn();
const mockGetCurrentUser = vi.fn();

vi.mock('@/services/auth', () => ({
  login: vi.fn(),
  register: (...args: unknown[]) => mockRegister(...args),
  logout: vi.fn(),
  getCurrentUser: (...args: unknown[]) => mockGetCurrentUser(...args),
  refreshAccessToken: vi.fn(),
  setSessionExpiredHandler: vi.fn(),
}));

mockGetCurrentUser.mockRejectedValue(new Error('No session'));

function renderRegister() {
  return render(
    <MemoryRouter initialEntries={['/auth/register']}>
      <ToastProvider>
        <AuthProvider>
          <RegisterPage />
        </AuthProvider>
      </ToastProvider>
    </MemoryRouter>,
  );
}

/** Fill all required fields with valid data. */
async function fillValidForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/first name/i), 'Jane');
  await user.type(screen.getByLabelText(/last name/i), 'Doe');
  await user.type(screen.getByLabelText(/^email/i), 'jane@example.com');
  await user.type(screen.getByLabelText(/^password/i), 'Strong1!pass');
  // Tab past the strength indicator into confirm password
  const confirmField = screen.getByLabelText(/confirm password/i);
  await user.type(confirmField, 'Strong1!pass');
}

/* -------------------------------------------------------------------------- */
/*  Tests                                                                     */
/* -------------------------------------------------------------------------- */

describe('RegisterPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCurrentUser.mockRejectedValue(new Error('No session'));
  });

  it('renders all form fields', () => {
    renderRegister();
    expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/last name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
  });

  it('renders role selection', () => {
    renderRegister();
    expect(screen.getByRole('radio', { name: /donor/i })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /charity/i })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /volunteer/i })).toBeInTheDocument();
  });

  it('renders create account button', () => {
    renderRegister();
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
  });

  it('shows link to login page', () => {
    renderRegister();
    expect(screen.getByRole('link', { name: /sign in/i })).toHaveAttribute('href', '/auth/login');
  });

  /* --- Validation --------------------------------------------------------- */

  it('shows errors for all empty fields', async () => {
    const user = userEvent.setup();
    renderRegister();

    await user.click(screen.getByRole('button', { name: /create account/i }));

    expect(screen.getByText('First name is required')).toBeInTheDocument();
    expect(screen.getByText('Last name is required')).toBeInTheDocument();
    expect(screen.getByText('Email is required')).toBeInTheDocument();
    expect(screen.getByText('Password is required')).toBeInTheDocument();
    expect(screen.getByText('Please confirm your password')).toBeInTheDocument();
  });

  it('validates password match', async () => {
    const user = userEvent.setup();
    renderRegister();

    await user.type(screen.getByLabelText(/first name/i), 'Jane');
    await user.type(screen.getByLabelText(/last name/i), 'Doe');
    await user.type(screen.getByLabelText(/^email/i), 'jane@example.com');
    await user.type(screen.getByLabelText(/^password/i), 'Strong1!pass');
    await user.type(screen.getByLabelText(/confirm password/i), 'Different1!');
    await user.click(screen.getByRole('button', { name: /create account/i }));

    expect(screen.getByText('Passwords do not match')).toBeInTheDocument();
  });

  it('validates email format', async () => {
    const user = userEvent.setup();
    renderRegister();

    await user.type(screen.getByLabelText(/first name/i), 'Jane');
    await user.type(screen.getByLabelText(/last name/i), 'Doe');
    await user.type(screen.getByLabelText(/^email/i), 'notanemail');
    await user.type(screen.getByLabelText(/^password/i), 'Strong1!pass');
    await user.type(screen.getByLabelText(/confirm password/i), 'Strong1!pass');
    await user.click(screen.getByRole('button', { name: /create account/i }));

    expect(screen.getByText('Enter a valid email address')).toBeInTheDocument();
  });

  /* --- Successful registration -------------------------------------------- */

  it('calls register API with correct data', async () => {
    const user = userEvent.setup();
    mockRegister.mockResolvedValueOnce({});

    renderRegister();
    await fillValidForm(user);

    await user.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      // Context converts camelCase → snake_case before calling the API
      expect(mockRegister).toHaveBeenCalledWith({
        email: 'jane@example.com',
        password: 'Strong1!pass',
        first_name: 'Jane',
        last_name: 'Doe',
        role: 'DONOR',
      });
    });
  });

  it('sends selected role to API', async () => {
    const user = userEvent.setup();
    mockRegister.mockResolvedValueOnce({});

    renderRegister();
    await fillValidForm(user);

    await user.click(screen.getByRole('radio', { name: /charity/i }));
    await user.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith(
        expect.objectContaining({ role: 'CHARITY' }),
      );
    });
  });

  /* --- Error handling ----------------------------------------------------- */

  it('maps field-level validation errors from API', async () => {
    const user = userEvent.setup();
    mockRegister.mockRejectedValueOnce({
      status: 400,
      message: 'Validation failed',
      fieldErrors: { email: ['A user with this email already exists.'] },
    });

    renderRegister();
    await fillValidForm(user);

    await user.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByText('A user with this email already exists.')).toBeInTheDocument();
    });
  });

  it('shows network error for status 0', async () => {
    const user = userEvent.setup();
    mockRegister.mockRejectedValueOnce({ status: 0, message: 'Network error' });

    renderRegister();
    await fillValidForm(user);

    await user.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByText(/unable to connect/i)).toBeInTheDocument();
    });
  });

  it('shows server error for 500+', async () => {
    const user = userEvent.setup();
    mockRegister.mockRejectedValueOnce({ status: 500, message: 'Server error' });

    renderRegister();
    await fillValidForm(user);

    await user.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByText(/something went wrong on our end/i)).toBeInTheDocument();
    });
  });

  /* --- Accessibility ------------------------------------------------------ */

  it('form has aria-label for screen readers', () => {
    renderRegister();
    expect(screen.getByRole('form', { name: /create an account/i })).toBeInTheDocument();
  });

  it('form-level error has role="alert"', async () => {
    const user = userEvent.setup();
    mockRegister.mockRejectedValueOnce({ status: 401, message: 'Unauthorized' });

    renderRegister();
    await fillValidForm(user);

    await user.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      const alert = screen.getByRole('alert');
      expect(alert).toHaveAttribute('aria-live', 'assertive');
    });
  });
});
