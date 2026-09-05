import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import { ToastProvider } from '@/components';
import type { CharityOrganization } from '@/types/api';
import CharityOrganizationPage from './charity-organization';

/* -------------------------------------------------------------------------- */
/*  Mock services                                                              */
/* -------------------------------------------------------------------------- */

const mockGetMyOrganization = vi.fn();
const mockGetVerificationHistory = vi.fn();
const mockSubmitForVerification = vi.fn();
const mockUpdateOrganization = vi.fn();
const mockCreateOrganization = vi.fn();

vi.mock('@/services/charity', () => ({
  getMyOrganization: (...args: unknown[]) => mockGetMyOrganization(...args),
  getVerificationHistory: (...args: unknown[]) => mockGetVerificationHistory(...args),
  submitForVerification: (...args: unknown[]) => mockSubmitForVerification(...args),
  resubmitForVerification: vi.fn(),
  updateOrganization: (...args: unknown[]) => mockUpdateOrganization(...args),
  createOrganization: (...args: unknown[]) => mockCreateOrganization(...args),
}));

const ORG: CharityOrganization = {
  id: 1,
  owner: 1,
  owner_email: 'org@example.com',
  owner_name: 'Hope Foundation',
  name: 'Hope Foundation',
  description: 'Helping communities.',
  email: 'org@example.com',
  phone: '123',
  website: '',
  address: '',
  city: 'Mumbai',
  state: 'MH',
  country: 'India',
  registration_number: 'REG-123',
  verification_status: 'PENDING',
  verification_status_display: 'Pending',
  submitted_at: '2026-09-01T00:00:00Z',
  reviewed_at: null,
  reviewed_by: null,
  reviewed_by_name: null,
  verified_at: null,
  rejection_reason: null,
  created_at: '2026-09-01T00:00:00Z',
  updated_at: '2026-09-01T00:00:00Z',
};

function renderPage(org = ORG, { skipDefaultMocks = false } = {}) {
  if (!skipDefaultMocks) {
    mockGetMyOrganization.mockResolvedValue(org);
    mockGetVerificationHistory.mockResolvedValue([]);
    mockSubmitForVerification.mockResolvedValue({});
  }
  return render(
    <MemoryRouter>
      <ToastProvider>
        <CharityOrganizationPage />
      </ToastProvider>
    </MemoryRouter>,
  );
}

/* -------------------------------------------------------------------------- */
/*  Tests                                                                      */
/* -------------------------------------------------------------------------- */

describe('CharityOrganizationPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the charity nav', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByRole('navigation', { name: 'Charity management' })).toBeInTheDocument();
    });
  });

  it('renders the organization name field', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByLabelText(/organization name/i)).toHaveValue('Hope Foundation');
    });
  });

  it('shows the verification status', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Pending')).toBeInTheDocument();
    });
  });

  it('shows a submit button while pending', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Submit for verification' })).toBeInTheDocument();
    });
  });

  it('submits for verification', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Submit for verification' })).toBeInTheDocument();
    });
    await user.click(screen.getByRole('button', { name: 'Submit for verification' }));
    await waitFor(() => {
      expect(mockSubmitForVerification).toHaveBeenCalledWith(1);
    });
  });

  it('does not show submit for a verified organization', async () => {
    renderPage({ ...ORG, verification_status: 'VERIFIED', verification_status_display: 'Verified' });
    await waitFor(() => {
      expect(screen.getByText('Verified')).toBeInTheDocument();
    });
    expect(screen.queryByRole('button', { name: 'Submit for verification' })).not.toBeInTheDocument();
  });

  it('shows rejection reason when rejected', async () => {
    renderPage({
      ...ORG,
      verification_status: 'REJECTED',
      verification_status_display: 'Rejected',
      rejection_reason: 'Documents unclear',
    });
    await waitFor(() => {
      expect(screen.getByText(/Documents unclear/)).toBeInTheDocument();
    });
  });

  it('shows a create form when the charity has no organization', async () => {
    mockGetMyOrganization.mockRejectedValueOnce({ status: 404, message: 'Not found' });
    renderPage();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Create organization' })).toBeInTheDocument();
    });
  });

  it('creates an organization from the empty state', async () => {
    const user = userEvent.setup();
    mockGetMyOrganization.mockRejectedValueOnce({ status: 404, message: 'Not found' });
    mockCreateOrganization.mockResolvedValue(ORG);
    renderPage();
    await waitFor(() => {
      expect(screen.getByLabelText(/organization name/i)).toBeInTheDocument();
    });
    await user.type(screen.getByLabelText(/organization name/i), 'Hope Foundation');
    await user.type(screen.getByLabelText(/registration number/i), 'REG-123');
    await user.type(screen.getByLabelText(/contact email/i), 'org@example.com');
    await user.click(screen.getByRole('button', { name: 'Create organization' }));
    await waitFor(() => {
      expect(mockCreateOrganization).toHaveBeenCalled();
    });
  });

  /* ------------------------------------------------------------------------ */
  /*  Regression: initial render must use GET, never POST/create               */
  /* ------------------------------------------------------------------------ */

  it('calls getMyOrganization on initial render and does not call createOrganization', async () => {
    renderPage();
    await waitFor(() => {
      expect(mockGetMyOrganization).toHaveBeenCalledTimes(1);
    });
    // createOrganization must never be invoked during initial load
    expect(mockCreateOrganization).not.toHaveBeenCalled();
  });

  it('calls getMyOrganization on initial render even when no org exists', async () => {
    mockGetMyOrganization.mockRejectedValue({ status: 404, message: 'Not found' });
    renderPage();
    await waitFor(() => {
      expect(mockGetMyOrganization).toHaveBeenCalledTimes(1);
    });
    // createOrganization must not be called during initial load
    expect(mockCreateOrganization).not.toHaveBeenCalled();
  });

  /* ------------------------------------------------------------------------ */
  /*  Regression: create POST invoked exactly once on submit                    */
  /* ------------------------------------------------------------------------ */

  it('invokes createOrganization exactly once when clicking Create', async () => {
    const user = userEvent.setup();
    mockGetMyOrganization.mockRejectedValueOnce({ status: 404, message: 'Not found' });
    mockCreateOrganization.mockResolvedValue(ORG);
    renderPage();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Create organization' })).toBeInTheDocument();
    });
    await user.type(screen.getByLabelText(/organization name/i), 'Hope Foundation');
    await user.type(screen.getByLabelText(/registration number/i), 'REG-123');
    await user.type(screen.getByLabelText(/contact email/i), 'org@example.com');
    await user.click(screen.getByRole('button', { name: 'Create organization' }));
    await waitFor(() => {
      expect(mockCreateOrganization).toHaveBeenCalledTimes(1);
    });
  });

  /* ------------------------------------------------------------------------ */
  /*  Regression: editing uses PATCH (updateOrganization), not POST             */
  /* ------------------------------------------------------------------------ */

  it('calls updateOrganization (PATCH) when saving edits on an existing org', async () => {
    const user = userEvent.setup();
    mockUpdateOrganization.mockResolvedValue({ ...ORG, name: 'Updated Foundation' });
    renderPage();
    await waitFor(() => {
      expect(screen.getByLabelText(/organization name/i)).toHaveValue('Hope Foundation');
    });
    await user.clear(screen.getByLabelText(/organization name/i));
    await user.type(screen.getByLabelText(/organization name/i), 'Updated Foundation');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() => {
      expect(mockUpdateOrganization).toHaveBeenCalledTimes(1);
      expect(mockUpdateOrganization).toHaveBeenCalledWith(1, expect.objectContaining({ name: 'Updated Foundation' }));
    });
    // createOrganization must not be called during edit
    expect(mockCreateOrganization).not.toHaveBeenCalled();
  });

  /* ------------------------------------------------------------------------ */
  /*  Regression: create error does not hide the create form                    */
  /* ------------------------------------------------------------------------ */

  it('keeps the create form visible after a create error', async () => {
    const user = userEvent.setup();
    mockGetMyOrganization.mockRejectedValueOnce({ status: 404, message: 'Not found' });
    mockCreateOrganization.mockRejectedValueOnce({ status: 500, message: 'Server error' });
    renderPage();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Create organization' })).toBeInTheDocument();
    });
    await user.type(screen.getByLabelText(/organization name/i), 'Test Org');
    await user.type(screen.getByLabelText(/registration number/i), 'REG-999');
    await user.type(screen.getByLabelText(/contact email/i), 'test@example.com');
    await user.click(screen.getByRole('button', { name: 'Create organization' }));
    await waitFor(() => {
      expect(mockCreateOrganization).toHaveBeenCalledTimes(1);
    });
    // The create form should still be visible so the user can retry
    expect(screen.getByRole('button', { name: 'Create organization' })).toBeInTheDocument();
    expect(screen.getByText(/create your organization/i)).toBeInTheDocument();
  });

  /* ------------------------------------------------------------------------ */
  /*  Regression: 401 / 403 handling                                           */
  /* ------------------------------------------------------------------------ */

  it('shows an error state for 401 unauthorized', async () => {
    mockGetMyOrganization.mockRejectedValue({ status: 401, message: 'Authentication credentials were not provided.' });
    renderPage(ORG, { skipDefaultMocks: true });
    await waitFor(() => {
      expect(screen.getByText(/could not load your organization/i)).toBeInTheDocument();
    });
  });

  it('shows an error state for 403 forbidden', async () => {
    mockGetMyOrganization.mockRejectedValue({ status: 403, message: 'You do not have permission to view this organization.' });
    renderPage(ORG, { skipDefaultMocks: true });
    await waitFor(() => {
      expect(screen.getByText(/could not load your organization/i)).toBeInTheDocument();
    });
  });

  /* ------------------------------------------------------------------------ */
  /*  Regression: create validation feedback                                    */
  /* ------------------------------------------------------------------------ */

  function toastErrorCount(): number {
    return document.querySelectorAll('.toast--error').length;
  }

  async function setupCreateForm() {
    const user = userEvent.setup();
    mockGetMyOrganization.mockRejectedValueOnce({ status: 404, message: 'No charity organization found for this user.' });
    renderPage();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Create organization' })).toBeInTheDocument();
    });
    await user.type(screen.getByLabelText(/organization name/i), 'Kerala Community Impact Foundation');
    await user.type(screen.getByLabelText(/registration number/i), 'KCI-TEST-2026-001');
    await user.type(screen.getByLabelText(/contact email/i), 'kerala@gmail.com');
    return user;
  }

  it('shows exactly ONE error toast and highlights the field for a field-level 400', async () => {
    const user = await setupCreateForm();
    mockCreateOrganization.mockRejectedValueOnce({
      status: 400,
      message: 'Request failed with status 400.',
      fieldErrors: { name: ['charity organization with this organization name already exists.'] },
    });

    await user.click(screen.getByRole('button', { name: 'Create organization' }));

    await waitFor(() => {
      expect(mockCreateOrganization).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      expect(toastErrorCount()).toBe(1);
    });
    // The offending field is visibly highlighted with the accessible error
    expect(screen.getByLabelText(/organization name/i)).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText(/already exists/i)).toBeInTheDocument();
    expect(screen.getByText('Please fix the highlighted fields')).toBeInTheDocument();
  });

  it('shows the real API message (not "fix highlighted") for non-field errors', async () => {
    const user = await setupCreateForm();
    // DRF form-level error — nothing on the form is actually highlighted.
    mockCreateOrganization.mockRejectedValueOnce({
      status: 400,
      message: 'A charity user can only own one organization.',
      fieldErrors: { non_field_errors: ['A charity user can only own one organization.'] },
    });

    await user.click(screen.getByRole('button', { name: 'Create organization' }));

    await waitFor(() => {
      expect(toastErrorCount()).toBe(1);
    });
    expect(screen.getByText('A charity user can only own one organization.')).toBeInTheDocument();
    expect(screen.queryByText('Please fix the highlighted fields')).not.toBeInTheDocument();
  });

  it('deduplicates identical toasts across repeated failed submissions', async () => {
    const user = await setupCreateForm();
    mockCreateOrganization.mockRejectedValue({
      status: 400,
      message: 'Request failed with status 400.',
      fieldErrors: { name: ['charity organization with this organization name already exists.'] },
    });

    await user.click(screen.getByRole('button', { name: 'Create organization' }));
    await waitFor(() => {
      expect(toastErrorCount()).toBe(1);
    });
    // Submit again with the same invalid data — still only one visible toast.
    await user.click(screen.getByRole('button', { name: 'Create organization' }));
    await waitFor(() => {
      expect(mockCreateOrganization).toHaveBeenCalledTimes(2);
    });
    expect(toastErrorCount()).toBe(1);
  });

  it('creates the organization when blank optional fields are sent empty', async () => {
    const user = await setupCreateForm();
    mockCreateOrganization.mockResolvedValue(ORG);

    await user.click(screen.getByRole('button', { name: 'Create organization' }));

    await waitFor(() => {
      expect(mockCreateOrganization).toHaveBeenCalledTimes(1);
    });
    // Success path switches to the org profile (no error toasts)
    expect(screen.getByText('Organization created')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeInTheDocument();
    expect(toastErrorCount()).toBe(0);
  });
});
